"""
Puente con la API del modelo (OpenAI o NVIDIA NIM) y persistencia de la
conversacion.

La llave vive solo aqui, en el servidor: el navegador nunca la ve. La respuesta
se devuelve en trozos: con OpenAI el primer token llega en un par de segundos,
pero con el endpoint gratuito de NVIDIA se ha medido hasta mas de 100, y sin
streaming la pagina se queda muerta todo ese rato.

`CHAT_PROVIDER` decide quien responde. Los dos hablan el dialecto de OpenAI.
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
    "directa. Usa Markdown (listas, negritas, tablas y bloques de código) "
    "cuando ayude a entender la respuesta, pero no envuelvas la respuesta "
    "completa en un bloque de código: la interfaz ya la muestra con formato. "
    "Los bloques de código son solo para código. Si no sabes algo, dilo en vez "
    "de inventarlo."
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


class Proveedor:
    """
    Datos del servicio que responde el chat.

    Los dos proveedores hablan el mismo dialecto (el de OpenAI), asi que solo
    cambian la URL, la llave, el modelo y algun parametro suelto.
    """

    def __init__(self, nombre: str, base_url: str, api_key: str, modelo: str):
        self.nombre = nombre
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.modelo = modelo

    @property
    def configurado(self) -> bool:
        return bool(self.api_key)

    def extras(self) -> dict[str, object]:
        """
        Parametros que solo entiende cierta familia de modelos.

        Cada familia nombra distinto lo del razonamiento:

        - DeepSeek: `chat_template_kwargs.thinking`, que se apaga porque agrega
          diez segundos o mas de espera sin mejorar la respuesta.
        - Kimi: `reasoning_effort`, con valores `low`, `high` o `max`.
        - Los modelos o1/o3/o4 y gpt-5 de OpenAI no aceptan `max_tokens`:
          quieren `max_completion_tokens`, y eso se resuelve en `cuerpo()`.

        Un modelo que no reconozca el parametro lo ignora, asi que el peor caso
        es quedarse con su comportamiento por defecto.
        """
        modelo = self.modelo.lower()

        if "deepseek" in modelo:
            return {"chat_template_kwargs": {"thinking": False}}

        if "kimi" in modelo and settings.NVIDIA_REASONING_EFFORT:
            return {"reasoning_effort": settings.NVIDIA_REASONING_EFFORT}

        return {}

    def limite_de_salida(self) -> dict[str, int]:
        """El nombre del tope de tokens cambio en los modelos que razonan."""
        modelo = self.modelo.lower()
        nuevo = modelo.startswith(("o1", "o3", "o4", "gpt-5"))
        clave = "max_completion_tokens" if nuevo else "max_tokens"
        return {clave: settings.CHAT_MAX_TOKENS}


def proveedor_activo() -> Proveedor:
    """El proveedor que indique `CHAT_PROVIDER`; por defecto OpenAI."""
    if settings.CHAT_PROVIDER == "nvidia":
        return Proveedor(
            "nvidia",
            settings.NVIDIA_BASE_URL,
            settings.NVIDIA_API_KEY,
            settings.NVIDIA_MODEL,
        )

    return Proveedor(
        "openai",
        settings.OPENAI_API_BASE,
        settings.OPENAI_API_KEY,
        settings.OPENAI_MODEL,
    )


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
    proveedor = proveedor_activo()

    yield _evento(
        "start",
        conversation_id=str(conversacion.id),
        title=conversacion.title,
        model=proveedor.modelo,
        provider=proveedor.nombre,
    )

    if not proveedor.configurado:
        variable = "OPENAI_API_KEY" if proveedor.nombre == "openai" else "NVIDIA_API_KEY"
        yield _evento(
            "error",
            message=f"El servidor no tiene configurada {variable} en su .env.",
        )
        return

    cuerpo = {
        "model": proveedor.modelo,
        "messages": [
            {"role": "system", "content": SISTEMA},
            *historial_para_modelo(conversacion),
        ],
        "temperature": settings.CHAT_TEMPERATURE,
        "top_p": 0.95,
        "stream": True,
        **proveedor.limite_de_salida(),
        **proveedor.extras(),
    }

    partes: list[str] = []
    razonando = False
    try:
        with httpx.Client(timeout=httpx.Timeout(300.0, connect=20.0)) as cliente:
            with cliente.stream(
                "POST",
                f"{proveedor.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {proveedor.api_key}",
                    "Accept": "text/event-stream",
                },
                json=cuerpo,
            ) as respuesta:
                if respuesta.status_code >= 400:
                    detalle = respuesta.read().decode("utf-8", "replace")
                    # El detalle del proveedor va al log, no al navegador: puede
                    # traer datos de la cuenta.
                    logger.warning(
                        "%s respondió %s: %s",
                        proveedor.nombre,
                        respuesta.status_code,
                        detalle[:500],
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
        logger.warning("Fallo de red con %s: %s", proveedor.nombre, exc)
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
