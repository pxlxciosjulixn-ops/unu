"""Endpoints transversales del proyecto: estado del servicio y chat."""

import django
from django.conf import settings
from django.db import connection
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from core import chat as servicio_chat


def _check_database() -> tuple[bool, str]:
    """Ejecuta un SELECT 1 para verificar que la base responde de verdad."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:  # noqa: BLE001 - se reporta, no se propaga
        return False, f"{type(exc).__name__}: {exc}"
    return True, "ok"


@api_view(["GET"])
def health(request: Request) -> Response:
    """
    Estado del servicio.

    Devuelve 200 si la API y la base de datos responden, 503 si la base falla.
    Pensado para el health check de Render y para comprobar de un vistazo que
    la configuracion del entorno quedo bien.
    """
    db_ok, db_detail = _check_database()

    payload = {
        "status": "ok" if db_ok else "degraded",
        "debug": settings.DEBUG,
        "django": django.get_version(),
        "database": {
            "connected": db_ok,
            "engine": connection.settings_dict["ENGINE"].rsplit(".", 1)[-1],
            "name": connection.settings_dict["NAME"],
            "detail": db_detail,
        },
        # Solo se informa si la key esta configurada, nunca su valor.
        "integrations": {
            "nvidia": {
                "configured": bool(settings.NVIDIA_API_KEY),
                "model": settings.NVIDIA_MODEL,
            }
        },
    }

    http_status = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=http_status)


class ChatThrottle(ScopedRateThrottle):
    """Limita el gasto de la cuota de NVIDIA (ver DEFAULT_THROTTLE_RATES)."""

    scope = "chat"


@api_view(["POST"])
@throttle_classes([ChatThrottle])
def chat(request: Request) -> StreamingHttpResponse | Response:
    """
    Conversa con el modelo de NVIDIA y devuelve la respuesta en trozos.

    Recibe `{"messages": [{"role": "user"|"assistant", "content": "..."}]}` y
    responde un flujo SSE con eventos `start`, `delta`, `done` y `error`.
    La key nunca sale del servidor.
    """
    try:
        mensajes = servicio_chat.limpiar_mensajes(request.data.get("messages"))
    except servicio_chat.ChatError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    respuesta = StreamingHttpResponse(
        servicio_chat.transmitir(mensajes),
        content_type="text/event-stream",
    )
    respuesta["Cache-Control"] = "no-cache"
    # Evita que un proxy (nginx en Render) acumule la respuesta y arruine el streaming.
    respuesta["X-Accel-Buffering"] = "no"
    return respuesta
