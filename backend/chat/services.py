"""
Puente con la API de NVIDIA NIM (compatible con la de OpenAI) y persistencia
de la conversacion.

La llave vive solo aqui, en el servidor: el navegador nunca la ve. La respuesta
se devuelve en trozos porque el modelo tarda entre 15 y 30 segundos en soltar
la primera palabra, y sin streaming la pagina se queda muerta todo ese rato.
"""

from __future__ import annotations

import hashlib
import json
import logging
from collections.abc import Iterator

import httpx
from django.conf import settings

from chat.models import Conversation, Message

logger = logging.getLogger(__name__)

SISTEMA = (
    "Eres un asistente conversacional. Responde en español, de forma clara y "
    "directa. Puedes usar Markdown (listas, negritas, tablas y bloques de "
    "código) cuando ayude a entender la respuesta. Si no sabes algo, dilo en "
    "vez de inventarlo."
)

# Cuanta conversacion se le manda al modelo en cada turno.
MAX_MENSAJES = 20
MAX_CARACTERES_MENSAJE = 6000
MAX_CARACTERES_TOTAL = 24000


class ChatError(Exception):
    """Error que se le puede mostrar al usuario tal cual."""


def ip_del_visitante(request) -> str:
    """
    IP real del visitante.

    Detras del proxy de Render, `REMOTE_ADDR` es el proxy: la IP de verdad va
    en la primera posicion de `X-Forwarded-For`.
    """
    reenviada = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if reenviada:
        return reenviada.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "") or "desconocida"


def hash_visitante(ip: str) -> str:
    """Hash con sal de la IP: identifica al visitante sin guardar su IP."""
    sal = settings.SECRET_KEY.encode()
    return hashlib.sha256(sal + ip.encode()).hexdigest()


def titulo_desde(texto: str) -> str:
    """Titulo corto de la conversacion, sacado del primer mensaje."""
    limpio = " ".join(texto.split())
    return limpio[:80] + ("…" if len(limpio) > 80 else "")


def historial_para_modelo(conversacion: Conversation) -> list[dict[str, str]]:
    """Ultimos mensajes de la conversacion, recortados a los limites."""
    mensajes = [
        {"role": m.role, "content": m.content[:MAX_CARACTERES_MENSAJE]}
        for m in conversacion.messages.all().order_by("-created_at", "-id")[:MAX_MENSAJES]
    ][::-1]

    total = sum(len(m["content"]) for m in mensajes)
    while total > MAX_CARACTERES_TOTAL and len(mensajes) > 1:
        fuera = mensajes.pop(0)
        total -= len(fuera["content"])
    return mensajes


def parametros_del_modelo() -> dict[str, object]:
    """
    Parametros que solo entiende cierta familia de modelos.

    Cambiar `NVIDIA_MODEL` en el `.env` no deberia obligar a tocar el codigo,
    pero cada familia nombra distinto lo del razonamiento:

    - DeepSeek: `chat_template_kwargs.thinking`, que aqui se apaga porque
      agrega diez segundos o mas de espera sin mejorar la respuesta.
    - Kimi: `reasoning_effort`, con valores `low`, `high` o `max`. Se deja en
      `low` por lo mismo.

    Un modelo que no reconozca el parametro simplemente lo ignora, asi que el
    peor caso de equivocarse aqui es quedarse con el comportamiento por defecto.
    """
    modelo = settings.NVIDIA_MODEL.lower()

    if "deepseek" in modelo:
        return {"chat_template_kwargs": {"thinking": False}}

    if "kimi" in modelo and settings.NVIDIA_REASONING_EFFORT:
        return {"reasoning_effort": settings.NVIDIA_REASONING_EFFORT}

    return {}


def _evento(tipo: str, **datos: object) -> bytes:
    """Un evento SSE: `data: {...}\\n\\n`."""
    return f"data: {json.dumps({'type': tipo, **datos}, ensure_ascii=False)}\n\n".encode()


def transmitir(conversacion: Conversation) -> Iterator[bytes]:
    """
    Llama al modelo con el historial de la conversacion y va devolviendo
    eventos SSE:

    - `start`: conversacion y modelo.
    - `delta`: un trozo de texto de la respuesta.
    - `done`: termino; trae el texto completo ya guardado.
    - `error`: algo fallo; el texto ya viene listo para mostrar.

    La respuesta se guarda en la base al terminar, y tambien si el visitante
    cierra la pagina a mitad: lo que alcanzo a llegar no se pierde.
    """
    yield _evento(
        "start",
        conversation_id=str(conversacion.id),
        title=conversacion.title,
        model=settings.NVIDIA_MODEL,
    )

    if not settings.NVIDIA_API_KEY:
        yield _evento(
            "error",
            message="El servidor no tiene configurada NVIDIA_API_KEY en su .env.",
        )
        return

    cuerpo = {
        "model": settings.NVIDIA_MODEL,
        "messages": [
            {"role": "system", "content": SISTEMA},
            *historial_para_modelo(conversacion),
        ],
        "temperature": settings.NVIDIA_TEMPERATURE,
        "top_p": 0.95,
        "max_tokens": settings.NVIDIA_MAX_TOKENS,
        "stream": True,
        **parametros_del_modelo(),
    }

    partes: list[str] = []
    razonando = False
    try:
        with httpx.Client(timeout=httpx.Timeout(300.0, connect=20.0)) as cliente:
            with cliente.stream(
                "POST",
                f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                    "Accept": "text/event-stream",
                },
                json=cuerpo,
            ) as respuesta:
                if respuesta.status_code >= 400:
                    detalle = respuesta.read().decode("utf-8", "replace")
                    # El detalle del proveedor va al log, no al navegador: puede
                    # traer datos de la cuenta.
                    logger.warning(
                        "NVIDIA respondió %s: %s", respuesta.status_code, detalle[:500]
                    )
                    yield _evento(
                        "error",
                        message=(
                            "El modelo rechazó la petición "
                            f"(código {respuesta.status_code}). Revisa la key o la cuota."
                        ),
                    )
                    return

                for linea in respuesta.iter_lines():
                    if not linea or not linea.startswith("data:"):
                        continue
                    datos = linea[5:].strip()
                    if datos == "[DONE]":
                        break
                    try:
                        trozo = json.loads(datos)
                    except json.JSONDecodeError:
                        continue

                    opciones = trozo.get("choices") or []
                    if not opciones:
                        continue
                    delta = opciones[0].get("delta") or {}

                    # Los modelos que razonan mandan primero su razonamiento.
                    # No se muestra (es ruido), pero avisa que ya esta trabajando.
                    if delta.get("reasoning_content") and not razonando:
                        razonando = True
                        yield _evento("thinking")

                    texto = delta.get("content")
                    if texto:
                        partes.append(texto)
                        yield _evento("delta", text=texto)

        if not partes:
            yield _evento("error", message="El modelo no devolvió texto.")
            return

        yield _evento("done", text="".join(partes))

    except httpx.TimeoutException:
        yield _evento(
            "error", message="El modelo tardó demasiado en responder. Intenta de nuevo."
        )
    except httpx.HTTPError as exc:
        logger.warning("Fallo de red con NVIDIA: %s", exc)
        yield _evento("error", message="No se pudo conectar con el modelo.")
    finally:
        # `finally` tambien corre si el visitante cierra la pestaña a mitad de
        # la respuesta: lo que llego queda guardado.
        texto = "".join(partes).strip()
        if texto:
            Message.objects.create(
                conversation=conversacion,
                role=Message.Role.ASSISTANT,
                content=texto,
            )
            conversacion.save(update_fields=["updated_at"])
