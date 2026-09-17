"""
Puente con la API de NVIDIA NIM (compatible con la de OpenAI).

La llave vive solo aqui, en el servidor: el navegador nunca la ve. La respuesta
se devuelve en trozos porque el modelo tarda entre 15 y 25 segundos en soltar
la primera palabra, y sin streaming la pagina se queda muerta todo ese rato.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

SISTEMA = (
    "Eres un asistente conversacional. Responde en español, de forma clara y "
    "directa. Si no sabes algo, dilo en vez de inventarlo."
)

# Limites de la conversacion que se manda al modelo.
MAX_MENSAJES = 20
MAX_CARACTERES_MENSAJE = 6000
MAX_CARACTERES_TOTAL = 24000

ROLES_VALIDOS = {"user", "assistant"}


class ChatError(Exception):
    """Error que se le puede mostrar al usuario tal cual."""


def limpiar_mensajes(crudos: object) -> list[dict[str, str]]:
    """Valida la conversacion que llega del navegador."""
    if not isinstance(crudos, list) or not crudos:
        raise ChatError("Falta la conversación.")

    mensajes: list[dict[str, str]] = []
    for item in crudos[-MAX_MENSAJES:]:
        if not isinstance(item, dict):
            raise ChatError("Cada mensaje debe ser un objeto con rol y contenido.")
        rol = item.get("role")
        texto = item.get("content")
        if rol not in ROLES_VALIDOS or not isinstance(texto, str):
            raise ChatError("Rol o contenido inválido en la conversación.")
        texto = texto.strip()
        if not texto:
            continue
        mensajes.append({"role": rol, "content": texto[:MAX_CARACTERES_MENSAJE]})

    if not mensajes:
        raise ChatError("El mensaje está vacío.")
    if mensajes[-1]["role"] != "user":
        raise ChatError("El último mensaje debe ser del usuario.")

    total = sum(len(m["content"]) for m in mensajes)
    while total > MAX_CARACTERES_TOTAL and len(mensajes) > 1:
        fuera = mensajes.pop(0)
        total -= len(fuera["content"])

    return mensajes


def _evento(tipo: str, **datos: object) -> bytes:
    """Un evento SSE: `data: {...}\\n\\n`."""
    return f"data: {json.dumps({'type': tipo, **datos}, ensure_ascii=False)}\n\n".encode()


def transmitir(mensajes: list[dict[str, str]]) -> Iterator[bytes]:
    """
    Llama al modelo y va devolviendo eventos SSE:

    - `start`: llegó la conexión, con el nombre del modelo.
    - `delta`: un trozo de texto de la respuesta.
    - `done`: terminó.
    - `error`: algo falló; el texto ya viene listo para mostrar.
    """
    if not settings.NVIDIA_API_KEY:
        yield _evento(
            "error",
            message="El servidor no tiene configurada NVIDIA_API_KEY en su .env.",
        )
        return

    cuerpo = {
        "model": settings.NVIDIA_MODEL,
        "messages": [{"role": "system", "content": SISTEMA}, *mensajes],
        "temperature": 0.6,
        "top_p": 0.95,
        "max_tokens": 2048,
        "stream": True,
        # El modo de razonamiento agrega 10 segundos o mas de espera y aqui no
        # aporta: para una conversacion normal se deja apagado.
        "chat_template_kwargs": {"thinking": False},
    }

    yield _evento("start", model=settings.NVIDIA_MODEL)

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
                    texto = delta.get("content")
                    if texto:
                        yield _evento("delta", text=texto)

        yield _evento("done")

    except httpx.TimeoutException:
        yield _evento(
            "error", message="El modelo tardó demasiado en responder. Intenta de nuevo."
        )
    except httpx.HTTPError as exc:
        logger.warning("Fallo de red con NVIDIA: %s", exc)
        yield _evento("error", message="No se pudo conectar con el modelo.")
