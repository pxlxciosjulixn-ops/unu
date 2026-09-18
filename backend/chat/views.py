"""
Endpoints del chatbot: conversar con el modelo y consultar el historial.

Todo se agrupa por visitante (hash de su IP), sin inicio de sesion.
"""

from __future__ import annotations

from django.db.models import Count
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from chat import services
from chat.models import Conversation, Message

MAX_CARACTERES_MENSAJE = services.MAX_CARACTERES_MENSAJE
MAX_CONVERSACIONES = 50


class ChatThrottle(ScopedRateThrottle):
    """Limita el gasto de la cuota de NVIDIA (ver DEFAULT_THROTTLE_RATES)."""

    scope = "chat"


def _visitante(request: Request) -> str:
    peticion = getattr(request, "_request", request)
    return services.hash_visitante(services.ip_del_visitante(peticion))


def _alcance(valor: object) -> str:
    """El alcance pedido, si es uno de los que existen; si no, el general."""
    if valor in Conversation.Scope.values:
        return str(valor)
    return Conversation.Scope.GENERAL


def _conversacion_como_dict(conversacion: Conversation, mensajes: int | None = None) -> dict:
    return {
        "id": str(conversacion.id),
        "title": conversacion.title,
        "scope": conversacion.scope,
        "created_at": conversacion.created_at,
        "updated_at": conversacion.updated_at,
        "message_count": (
            mensajes if mensajes is not None else conversacion.messages.count()
        ),
    }


def _mensaje_como_dict(mensaje: Message) -> dict:
    return {
        "id": mensaje.id,
        "role": mensaje.role,
        "content": mensaje.content,
        "created_at": mensaje.created_at,
    }


@api_view(["GET"])
def conversations(request: Request) -> Response:
    """
    Conversaciones del visitante, de la mas reciente a la mas antigua.

    Se filtran por alcance (`?scope=`, general por defecto) para que el
    historial de la pagina /chatbot no se mezcle con las preguntas sueltas que
    alguien le hace al chat flotante de la hoja de vida.
    """
    visitante = _visitante(request)
    consulta = (
        Conversation.objects.filter(
            visitor=visitante, scope=_alcance(request.query_params.get("scope"))
        )
        .annotate(total=Count("messages"))
        .order_by("-updated_at")[:MAX_CONVERSACIONES]
    )
    return Response(
        {
            "results": [_conversacion_como_dict(c, c.total) for c in consulta],
        }
    )


@api_view(["GET", "DELETE"])
def conversation_detail(request: Request, conversation_id) -> Response:
    """Mensajes de una conversacion, o su borrado."""
    conversacion = get_object_or_404(
        Conversation, id=conversation_id, visitor=_visitante(request)
    )

    if request.method == "DELETE":
        conversacion.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(
        {
            **_conversacion_como_dict(conversacion),
            "messages": [
                _mensaje_como_dict(m) for m in conversacion.messages.all()
            ],
        }
    )


@api_view(["DELETE"])
def conversations_clear(request: Request) -> Response:
    """Borra todas las conversaciones del visitante."""
    borradas, _ = Conversation.objects.filter(visitor=_visitante(request)).delete()
    return Response({"deleted": borradas})


@api_view(["POST"])
@throttle_classes([ChatThrottle])
def send(request: Request) -> StreamingHttpResponse | Response:
    """
    Manda un mensaje y devuelve la respuesta del modelo en trozos (SSE).

    Recibe `{"message": "...", "conversation_id": "uuid opcional", "scope":
    "general|resume"}`. Sin `conversation_id` se crea una conversacion nueva
    con ese alcance; con el, manda el alcance que ya tenia la conversacion. El
    mensaje del usuario y la respuesta quedan guardados en la base.
    """
    texto = (request.data.get("message") or "").strip()
    if not texto:
        return Response(
            {"detail": "El mensaje está vacío."}, status=status.HTTP_400_BAD_REQUEST
        )
    texto = texto[:MAX_CARACTERES_MENSAJE]

    visitante = _visitante(request)
    identificador = request.data.get("conversation_id")

    if identificador:
        conversacion = Conversation.objects.filter(
            id=identificador, visitor=visitante
        ).first()
        if conversacion is None:
            return Response(
                {"detail": "Esa conversación no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        conversacion = Conversation.objects.create(
            visitor=visitante,
            title=services.titulo_desde(texto),
            scope=_alcance(request.data.get("scope")),
        )

    if not conversacion.title:
        conversacion.title = services.titulo_desde(texto)
        conversacion.save(update_fields=["title"])

    Message.objects.create(
        conversation=conversacion, role=Message.Role.USER, content=texto
    )

    respuesta = StreamingHttpResponse(
        services.transmitir(conversacion),
        content_type="text/event-stream",
    )
    respuesta["Cache-Control"] = "no-cache"
    # Evita que un proxy (nginx en Render) acumule la respuesta y arruine el streaming.
    respuesta["X-Accel-Buffering"] = "no"
    return respuesta
