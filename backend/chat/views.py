"""
Endpoints del chatbot: conversar con el modelo y consultar el historial.

Todo se agrupa por visitante (hash de su IP), sin inicio de sesion.
"""

from __future__ import annotations

import hmac
import json
from collections import Counter

from django.conf import settings
from django.db.models import Count
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from chat import estadisticas, services, whatsapp
from chat import perfil as perfil_chat
from chat.models import (
    AjustesConsejero,
    AnalisisConversacion,
    Conversation,
    Message,
    PreferenciaVisitante,
    Valoracion,
)

MAX_CARACTERES_MENSAJE = services.MAX_CARACTERES_MENSAJE
MAX_CONVERSACIONES = 50

# Un chat de años en texto plano pesa unos pocos MB; mas que eso no es un
# export de WhatsApp sin archivos.
MAX_BYTES_CHAT = 5 * 1024 * 1024
MAX_CHATS_POR_VISITANTE = 20


class ChatThrottle(ScopedRateThrottle):
    """Limita el gasto de la cuota de NVIDIA (ver DEFAULT_THROTTLE_RATES)."""

    scope = "chat"


class SubidaChatThrottle(ScopedRateThrottle):
    """La subida es publica: el cupo frena a un bot que la encuentre."""

    scope = "analisis"


class ClaveAjustesThrottle(ScopedRateThrottle):
    """La clave de ajustes se prueba a ciegas igual que un login: mismo cupo."""

    scope = "login"


def _visitante(request: Request) -> str:
    peticion = getattr(request, "_request", request)
    return services.hash_visitante(services.ip_del_visitante(peticion))


def _conversaciones_de(visitante: str):
    """
    Las conversaciones que el visitante ve. Las que "borro" siguen en la base
    con `borrada_en`, pero para el ya no existen.
    """
    return Conversation.objects.filter(visitor=visitante, borrada_en__isnull=True)


def _chats_de(visitante: str):
    """Los chats de WhatsApp que el visitante ve (los ocultos no cuentan)."""
    return AnalisisConversacion.objects.filter(
        visitor=visitante, borrado_en__isnull=True
    )


def _alcance(valor: object) -> str:
    """El alcance pedido, si es uno de los que existen; si no, el general."""
    if valor in Conversation.Scope.values:
        return str(valor)
    return Conversation.Scope.GENERAL


def _analisis_como_dict(analisis: AnalisisConversacion) -> dict:
    return {
        "id": analisis.id,
        "name": analisis.nombre,
        "participants": analisis.participantes,
        "message_count": analisis.total_mensajes,
        "since": analisis.desde,
        "until": analisis.hasta,
        "relationship": analisis.relacion,
        "profile": analisis.perfil or {},
        "days_talking": perfil_chat.dias_hablando(analisis.perfil or {}),
        "me": analisis.yo,
        # El export no dice quien lo subio si no viene "Tú": hay que preguntar.
        "needs_me": analisis.yo not in analisis.participantes,
        "created_at": analisis.created_at,
    }


def _conversacion_como_dict(conversacion: Conversation, mensajes: int | None = None) -> dict:
    analisis = conversacion.analisis
    if analisis is not None and analisis.borrado_en is not None:
        analisis = None
    return {
        "id": str(conversacion.id),
        "title": conversacion.title,
        "scope": conversacion.scope,
        "analysis": (
            {"id": analisis.id, "name": analisis.nombre} if analisis else None
        ),
        "created_at": conversacion.created_at,
        "updated_at": conversacion.updated_at,
        "message_count": (
            mensajes if mensajes is not None else conversacion.messages.count()
        ),
    }


def _mensaje_como_dict(mensaje: Message) -> dict:
    valoracion = getattr(mensaje, "valoracion", None)
    return {
        "id": mensaje.id,
        "role": mensaje.role,
        "content": mensaje.content,
        "created_at": mensaje.created_at,
        # `true` 👍, `false` 👎, `null` si no ha dicho nada.
        "feedback": valoracion.util if valoracion else None,
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
    alcance = _alcance(request.query_params.get("scope"))
    # El historial de /chatbot junta el asistente general y el consejero: los
    # dos viven en la misma pagina.
    alcances = [alcance]
    if alcance == Conversation.Scope.GENERAL:
        alcances.append(Conversation.Scope.CONSEJOS)
    consulta = (
        _conversaciones_de(visitante)
        .filter(scope__in=alcances)
        .select_related("analisis")
        .annotate(total=Count("messages"))
        .order_by("-updated_at")[:MAX_CONVERSACIONES]
    )
    return Response(
        {
            "results": [_conversacion_como_dict(c, c.total) for c in consulta],
            # Cuanto le queda al visitante: la pagina lo muestra y desactiva la
            # caja cuando llega a cero, en vez de dejarlo escribir para nada.
            "quota": services.cupo_de(visitante, alcance),
            # El consejero tiene su propio cupo; la pagina muestra este cuando
            # la conversacion usa un chat de WhatsApp.
            **(
                {"advice_quota": services.cupo_de(visitante, Conversation.Scope.CONSEJOS)}
                if alcance == Conversation.Scope.GENERAL
                else {}
            ),
        }
    )


@api_view(["GET", "POST"])
@throttle_classes([SubidaChatThrottle])
def analyses(request: Request) -> Response:
    """
    Chats de WhatsApp del visitante (GET) o subida de uno nuevo (POST).

    El POST recibe el `.txt` en el campo `file` (multipart). El archivo no se
    guarda: se lee, se limpia y lo que queda va a la tabla
    `analisis_conversaciones`, a nombre del visitante que lo subio.
    """
    visitante = _visitante(request)
    propios = _chats_de(visitante)

    if request.method == "GET":
        return Response({"results": [_analisis_como_dict(a) for a in propios]})

    archivo = request.FILES.get("file")
    if archivo is None:
        return Response(
            {"detail": "Adjunta el .txt del chat."}, status=status.HTTP_400_BAD_REQUEST
        )
    if not archivo.name.lower().endswith(".txt"):
        return Response(
            {"detail": "Solo se aceptan archivos .txt exportados de WhatsApp."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if archivo.size > MAX_BYTES_CHAT:
        return Response(
            {"detail": "El archivo pasa de 5 MB. Exporta el chat sin archivos."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        chat = whatsapp.leer_chat(whatsapp.decodificar(archivo.read()))
    except whatsapp.ChatInvalido as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    # En multipart el contexto llega como texto JSON.
    try:
        perfil = perfil_chat.limpiar(json.loads(request.data.get("profile") or "{}"))
    except (json.JSONDecodeError, perfil_chat.PerfilInvalido) as exc:
        return Response(
            {"detail": str(exc) if isinstance(exc, perfil_chat.PerfilInvalido) else "El contexto no es válido."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Un export nuevo del mismo chat (mismas personas) no crea otro: se le
    # agregan los mensajes que no tenia. Asi el chat va creciendo en el tiempo.
    existente = next(
        (
            a
            for a in propios
            if sorted(a.participantes) == sorted(chat.participantes)
        ),
        None,
    )
    if existente is not None:
        agregados = _unir_mensajes(existente, chat)
        return Response(
            {**_analisis_como_dict(existente), "merged": True, "added": agregados}
        )

    if propios.count() >= MAX_CHATS_POR_VISITANTE:
        return Response(
            {
                "detail": (
                    f"Ya tienes {MAX_CHATS_POR_VISITANTE} chats guardados. "
                    "Borra alguno para subir otro."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    analisis = AnalisisConversacion.objects.create(
        visitor=visitante,
        relacion=_relacion(request.data.get("relationship")),
        perfil=perfil,
        nombre=archivo.name[:120],
        participantes=chat.participantes,
        total_mensajes=len(chat.lineas),
        desde=chat.desde,
        hasta=chat.hasta,
        contenido=chat.contenido,
    )
    return Response(
        {**_analisis_como_dict(analisis), "merged": False, "added": len(chat.lineas)},
        status=status.HTTP_201_CREATED,
    )


def _unir_mensajes(analisis: AnalisisConversacion, chat: whatsapp.ChatLeido) -> int:
    """
    Agrega al chat guardado los mensajes del export nuevo que no tenia.

    Se compara mensaje por mensaje (fecha, hora, autor y texto) contando
    repetidos: dos "jaja" iguales en el mismo segundo siguen siendo dos.
    Devuelve cuantos mensajes se agregaron.
    """
    guardados = estadisticas.mensajes_de(analisis.contenido)
    disponibles = Counter(guardados)
    nuevos = []
    for mensaje in estadisticas.mensajes_de(chat.contenido):
        if disponibles[mensaje]:
            disponibles[mensaje] -= 1
        else:
            nuevos.append(mensaje)

    if nuevos:
        analisis.contenido = "\n".join([*guardados, *nuevos])
        analisis.total_mensajes = len(guardados) + len(nuevos)
        analisis.hasta = chat.hasta
        analisis.save(update_fields=["contenido", "total_mensajes", "hasta"])
    return len(nuevos)


def _chat_propio(request: Request, analysis_id: int) -> AnalisisConversacion:
    return get_object_or_404(_chats_de(_visitante(request)), id=analysis_id)


@api_view(["GET"])
def analysis_stats(request: Request, analysis_id: int) -> Response:
    """Estadisticas del chat: se calculan al vuelo, no gastan cuota del modelo."""
    chat = _chat_propio(request, analysis_id)
    datos = estadisticas.calcular(chat.contenido, chat.yo, chat.perfil)
    if datos is None:
        return Response(
            {"detail": "No se pudieron leer las fechas de este chat."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    return Response(datos)


def _ajustes_como_dict(visitante: str) -> dict:
    return {
        "unlimited": PreferenciaVisitante.objects.filter(
            visitor=visitante, sin_limite=True
        ).exists(),
        "profanity": services.groseria_de(visitante),
        "personality": services.personalidad_de(visitante),
        "max_chars": AjustesConsejero.actuales().max_caracteres,
        "min_chars": AjustesConsejero.MIN_CARACTERES,
        "max_chars_limit": AjustesConsejero.MAX_CARACTERES,
        # Cupo del consejero y cuantos se pueden desbloquear de una vez.
        "messages": services.cupo_de(visitante, Conversation.Scope.CONSEJOS),
        "unlock_min": services.MIN_MENSAJES_DESBLOQUEO,
        "unlock_max": services.MAX_MENSAJES_DESBLOQUEO,
    }


def _clave_valida(clave: object, esperada: str | None = None) -> bool:
    if esperada is None:
        esperada = settings.CONSEJERO_CLAVE_AJUSTES
    # `compare_digest` tarda lo mismo acierte o no: no deja adivinarla por
    # cuanto demora la respuesta.
    return bool(esperada) and hmac.compare_digest(
        str(clave or "").encode(), esperada.encode()
    )


@api_view(["GET"])
def chat_settings(request: Request) -> Response:
    """Ajustes del consejero: groserias del visitante y largo de respuestas."""
    return Response(_ajustes_como_dict(_visitante(request)))


@api_view(["PUT"])
def chat_settings_profanity(request: Request) -> Response:
    """Cambia el nivel de groserias del visitante (no pide clave)."""
    nivel = request.data.get("level")
    if nivel not in PreferenciaVisitante.Groseria.values:
        return Response(
            {"detail": "Nivel de grosería inválido."}, status=status.HTTP_400_BAD_REQUEST
        )
    visitante = _visitante(request)
    PreferenciaVisitante.objects.update_or_create(
        visitor=visitante, defaults={"groseria": nivel}
    )
    return Response(_ajustes_como_dict(visitante))


@api_view(["PUT"])
def chat_settings_personality(request: Request) -> Response:
    """Cambia quién habla en el chat (consejero, abuela…); no pide clave."""
    personalidad = request.data.get("personality")
    if personalidad not in PreferenciaVisitante.Personalidad.values:
        return Response(
            {"detail": "Personalidad inválida."}, status=status.HTTP_400_BAD_REQUEST
        )
    visitante = _visitante(request)
    PreferenciaVisitante.objects.update_or_create(
        visitor=visitante, defaults={"personalidad": personalidad}
    )
    return Response(_ajustes_como_dict(visitante))


@api_view(["POST"])
def message_feedback(request: Request, message_id: int) -> Response:
    """
    "¿Te sirvió?" de una respuesta: `{"useful": true|false}`, o `null` para
    quitarlo. Solo el dueño de la conversación puede valorarla.
    """
    visitante = _visitante(request)
    mensaje = get_object_or_404(
        Message,
        id=message_id,
        role=Message.Role.ASSISTANT,
        conversation__visitor=visitante,
    )
    util = request.data.get("useful")
    if util is None:
        Valoracion.objects.filter(mensaje=mensaje).delete()
        return Response({"feedback": None})
    if not isinstance(util, bool):
        return Response(
            {"detail": "Responde sí o no."}, status=status.HTTP_400_BAD_REQUEST
        )
    Valoracion.objects.update_or_create(
        mensaje=mensaje,
        defaults={
            "visitor": visitante,
            "util": util,
            # Lo que había al responder no se sabe; lo más cercano es lo que
            # tiene elegido ahora.
            "personalidad": services.personalidad_de(visitante),
            "groseria": services.groseria_de(visitante),
        },
    )
    return Response({"feedback": util})


@api_view(["PUT"])
@throttle_classes([ClaveAjustesThrottle])
def chat_settings_unlimited(request: Request) -> Response:
    """Mensajes sin tope para esta conexión; pide la clave de ajustes."""
    if not _clave_valida(request.data.get("password")):
        return Response(
            {"detail": "Contraseña incorrecta."}, status=status.HTTP_403_FORBIDDEN
        )
    visitante = _visitante(request)
    PreferenciaVisitante.objects.update_or_create(
        visitor=visitante,
        defaults={"sin_limite": bool(request.data.get("enabled"))},
    )
    return Response(_ajustes_como_dict(visitante))


@api_view(["POST"])
@throttle_classes([ClaveAjustesThrottle])
def chat_settings_messages(request: Request) -> Response:
    """
    Desbloquea mensajes del consejero para esta conexion con la clave de
    mensajes: `{"password": ..., "amount": 10..30}`. Deja exactamente esa
    cantidad por delante (ver `services.desbloquear_mensajes`).

    La clave vive solo aqui, en el entorno del servidor: el navegador nunca la
    conoce, solo la manda para que se compare.
    """
    if not _clave_valida(
        request.data.get("password"), settings.CONSEJERO_CLAVE_MENSAJES
    ):
        return Response(
            {"detail": "Contraseña incorrecta."}, status=status.HTTP_403_FORBIDDEN
        )
    try:
        cantidad = int(request.data.get("amount"))
    except (TypeError, ValueError):
        cantidad = 0
    minimo, maximo = services.MIN_MENSAJES_DESBLOQUEO, services.MAX_MENSAJES_DESBLOQUEO
    if not minimo <= cantidad <= maximo:
        return Response(
            {"detail": f"Elige entre {minimo} y {maximo} mensajes."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    visitante = _visitante(request)
    services.desbloquear_mensajes(visitante, Conversation.Scope.CONSEJOS, cantidad)
    return Response(_ajustes_como_dict(visitante))


def _resumen_de(filas, campo: str, nombres: dict) -> list[dict]:
    """Votos agrupados por un campo, con el porcentaje que le sirvió."""
    resumen = []
    for valor, nombre in nombres.items():
        del_grupo = [f for f in filas if f[campo] == valor]
        utiles = sum(1 for f in del_grupo if f["util"])
        resumen.append({
            "key": valor,
            "name": nombre,
            "up": utiles,
            "down": len(del_grupo) - utiles,
        })
    return resumen


@api_view(["POST"])
@throttle_classes([ClaveAjustesThrottle])
def feedback_stats(request: Request) -> Response:
    """Qué tal les parecen las respuestas a todos: solo con la clave."""
    if not _clave_valida(request.data.get("password")):
        return Response(
            {"detail": "Contraseña incorrecta."}, status=status.HTTP_403_FORBIDDEN
        )
    filas = list(Valoracion.objects.values("util", "personalidad", "groseria"))
    utiles = sum(1 for f in filas if f["util"])
    return Response({
        "total": len(filas),
        "up": utiles,
        "down": len(filas) - utiles,
        "people": Valoracion.objects.values("visitor").distinct().count(),
        "by_personality": _resumen_de(
            filas, "personalidad", dict(PreferenciaVisitante.Personalidad.choices)
        ),
        "by_profanity": _resumen_de(
            filas, "groseria", dict(PreferenciaVisitante.Groseria.choices)
        ),
    })


@api_view(["POST"])
@throttle_classes([ClaveAjustesThrottle])
def chat_settings_unlock(request: Request) -> Response:
    """Comprueba la clave antes de mostrar el editor del largo de respuestas."""
    if not _clave_valida(request.data.get("password")):
        return Response(
            {"detail": "Contraseña incorrecta."}, status=status.HTTP_403_FORBIDDEN
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["PUT"])
@throttle_classes([ClaveAjustesThrottle])
def chat_settings_length(request: Request) -> Response:
    """
    Cambia el largo maximo de las respuestas para todos. Pide la clave otra
    vez: desbloquear en la pagina no basta, el servidor no guarda sesiones.
    """
    if not _clave_valida(request.data.get("password")):
        return Response(
            {"detail": "Contraseña incorrecta."}, status=status.HTTP_403_FORBIDDEN
        )
    try:
        largo = int(request.data.get("max_chars"))
    except (TypeError, ValueError):
        largo = 0
    if not AjustesConsejero.MIN_CARACTERES <= largo <= AjustesConsejero.MAX_CARACTERES:
        return Response(
            {
                "detail": (
                    f"El largo debe estar entre {AjustesConsejero.MIN_CARACTERES} y "
                    f"{AjustesConsejero.MAX_CARACTERES} caracteres."
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    ajustes = AjustesConsejero.actuales()
    ajustes.max_caracteres = largo
    ajustes.save(update_fields=["max_caracteres", "updated_at"])
    return Response(_ajustes_como_dict(_visitante(request)))


def _relacion(valor: object) -> str:
    """La relacion pedida si existe; si no, vacia (el consejero la deduce)."""
    return str(valor) if valor in AnalisisConversacion.Relacion.values else ""


@api_view(["PATCH", "DELETE"])
def analysis_detail(request: Request, analysis_id: int) -> Response:
    """
    PATCH: cambia la relacion (`relationship`) o quien es el visitante en el
    chat (`me`, uno de los participantes).

    DELETE: "borra" un chat del visitante: deja de verlo y sus conversaciones quedan
    sin contexto, pero el chat se conserva en la base.
    """
    chat = get_object_or_404(_chats_de(_visitante(request)), id=analysis_id)

    if request.method == "PATCH":
        campos = []
        if "relationship" in request.data:
            chat.relacion = _relacion(request.data.get("relationship"))
            campos.append("relacion")
        if "profile" in request.data:
            try:
                chat.perfil = perfil_chat.limpiar(request.data.get("profile"))
            except perfil_chat.PerfilInvalido as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            campos.append("perfil")
        if "me" in request.data:
            if request.data.get("me") not in chat.participantes:
                return Response(
                    {"detail": "Esa persona no aparece en el chat."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            chat.yo = request.data.get("me")
            campos.append("yo")
        if campos:
            chat.save(update_fields=campos)
        return Response(_analisis_como_dict(chat))

    chat.borrado_en = timezone.now()
    chat.save(update_fields=["borrado_en"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET", "DELETE"])
def conversation_detail(request: Request, conversation_id) -> Response:
    """
    Mensajes de una conversacion, o su borrado. Borrar solo la oculta: la
    conversacion y sus mensajes se quedan en la base.
    """
    conversacion = get_object_or_404(
        _conversaciones_de(_visitante(request)), id=conversation_id
    )

    if request.method == "DELETE":
        conversacion.borrada_en = timezone.now()
        conversacion.save(update_fields=["borrada_en"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(
        {
            **_conversacion_como_dict(conversacion),
            "messages": [
                _mensaje_como_dict(m)
                for m in conversacion.messages.select_related("valoracion")
            ],
        }
    )


@api_view(["DELETE"])
def conversations_clear(request: Request) -> Response:
    """Oculta todas las conversaciones del visitante (siguen en la base)."""
    borradas = _conversaciones_de(_visitante(request)).update(
        borrada_en=timezone.now()
    )
    return Response({"deleted": borradas})


@api_view(["GET"])
def trash(request: Request) -> Response:
    """
    Lo que el visitante borro en /chatbot: chats de WhatsApp y conversaciones.
    Como borrar solo oculta, desde aqui se puede restaurar.
    """
    visitante = _visitante(request)
    chats = AnalisisConversacion.objects.filter(
        visitor=visitante, borrado_en__isnull=False, eliminado_en__isnull=True
    ).order_by("-borrado_en")
    conversaciones = (
        Conversation.objects.filter(
            visitor=visitante,
            borrada_en__isnull=False,
            eliminada_en__isnull=True,
            scope__in=[Conversation.Scope.GENERAL, Conversation.Scope.CONSEJOS],
        )
        .select_related("analisis")
        .annotate(total=Count("messages"))
        .order_by("-borrada_en")[:MAX_CONVERSACIONES]
    )
    return Response(
        {
            "analyses": [
                {**_analisis_como_dict(c), "deleted_at": c.borrado_en} for c in chats
            ],
            "conversations": [
                {**_conversacion_como_dict(c, c.total), "deleted_at": c.borrada_en}
                for c in conversaciones
            ],
        }
    )


@api_view(["POST"])
def analysis_restore(request: Request, analysis_id: int) -> Response:
    """Vuelve a mostrar un chat de WhatsApp que el visitante habia borrado."""
    chat = get_object_or_404(
        AnalisisConversacion,
        id=analysis_id,
        visitor=_visitante(request),
        borrado_en__isnull=False,
        eliminado_en__isnull=True,
    )
    chat.borrado_en = None
    chat.save(update_fields=["borrado_en"])
    return Response(_analisis_como_dict(chat))


@api_view(["POST"])
def conversation_restore(request: Request, conversation_id) -> Response:
    """Vuelve a mostrar una conversacion que el visitante habia borrado."""
    conversacion = get_object_or_404(
        Conversation,
        id=conversation_id,
        visitor=_visitante(request),
        borrada_en__isnull=False,
        eliminada_en__isnull=True,
    )
    conversacion.borrada_en = None
    conversacion.save(update_fields=["borrada_en"])
    return Response(_conversacion_como_dict(conversacion))


@api_view(["POST"])
def analysis_purge(request: Request, analysis_id: int) -> Response:
    """
    "Elimina definitivamente" un chat de la papelera: el visitante ya no lo
    vuelve a ver ni lo puede restaurar, pero el chat sigue en la base.
    """
    chat = get_object_or_404(
        AnalisisConversacion,
        id=analysis_id,
        visitor=_visitante(request),
        borrado_en__isnull=False,
        eliminado_en__isnull=True,
    )
    chat.eliminado_en = timezone.now()
    chat.save(update_fields=["eliminado_en"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
def conversation_purge(request: Request, conversation_id) -> Response:
    """Igual que `analysis_purge`, para una conversacion de la papelera."""
    conversacion = get_object_or_404(
        Conversation,
        id=conversation_id,
        visitor=_visitante(request),
        borrada_en__isnull=False,
        eliminada_en__isnull=True,
    )
    conversacion.eliminada_en = timezone.now()
    conversacion.save(update_fields=["eliminada_en"])
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@throttle_classes([ChatThrottle])
def send(request: Request) -> StreamingHttpResponse | Response:
    """
    Manda un mensaje y devuelve la respuesta del modelo en trozos (SSE).

    Recibe `{"message": "...", "conversation_id": "uuid opcional", "scope":
    "general|resume|finanzas", "analysis_id": id opcional}`. Sin
    `conversation_id` se crea una conversacion nueva con ese alcance; con el,
    manda el alcance que ya tenia la conversacion. Si al abrirla llega
    `analysis_id` (un chat de WhatsApp del mismo visitante), la conversacion es
    del consejero de relaciones y usa ese chat como contexto. El mensaje del
    usuario y la respuesta quedan guardados en la base.
    """
    texto = (request.data.get("message") or "").strip()
    if not texto:
        return Response(
            {"detail": "El mensaje está vacío."}, status=status.HTTP_400_BAD_REQUEST
        )

    visitante = _visitante(request)
    identificador = request.data.get("conversation_id")

    if identificador:
        conversacion = _conversaciones_de(visitante).filter(id=identificador).first()
        if conversacion is None:
            return Response(
                {"detail": "Esa conversación no existe."},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        alcance = _alcance(request.data.get("scope"))
        analisis = None
        identificador_chat = request.data.get("analysis_id")
        if identificador_chat:
            # Solo sus propios chats: el filtro por visitante es lo que impide
            # usar el de otra IP adivinando el id.
            analisis = (
                _chats_de(visitante).filter(id=identificador_chat).first()
                if str(identificador_chat).isdigit()
                else None
            )
            if analisis is None:
                return Response(
                    {"detail": "Ese chat de contexto no existe."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            alcance = Conversation.Scope.CONSEJOS
        elif alcance == Conversation.Scope.CONSEJOS:
            # El consejero sin chat no tiene nada que analizar.
            alcance = Conversation.Scope.GENERAL
        conversacion = Conversation.objects.create(
            visitor=visitante,
            title=services.titulo_desde(texto),
            scope=alcance,
            analisis=analisis,
        )

    cupo = services.cupo_de(visitante, conversacion.scope)
    if cupo["remaining"] == 0:
        return Response(
            {
                "detail": (
                    "Te quedaste sin mensajes. Si tienes la contraseña, "
                    "desbloquea más en Ajustes."
                    if conversacion.scope == Conversation.Scope.CONSEJOS
                    else f"Llegaste al límite de {cupo['limit']} mensajes de esta "
                    "demostración. Escríbeme por correo si quieres ver más."
                ),
                "quota": cupo,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # Los chats de la hoja de vida y de finanzas aceptan preguntas cortas. El
    # navegador ya frena el texto de mas, pero el tope se comprueba aqui: es lo
    # que evita que una peticion hecha a mano mande un mensaje enorme y se
    # pague en tokens.
    tope = services.MAX_CARACTERES_POR_ALCANCE.get(conversacion.scope)
    if tope is not None:
        if len(texto) > tope:
            return Response(
                {"detail": f"La pregunta no puede pasar de {tope} caracteres."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        texto = texto[:MAX_CARACTERES_MENSAJE]

    if not conversacion.title:
        conversacion.title = services.titulo_desde(texto)
        conversacion.save(update_fields=["title"])

    Message.objects.create(
        conversation=conversacion, role=Message.Role.USER, content=texto
    )
    services.gastar_del_cupo(visitante, conversacion.scope)

    respuesta = StreamingHttpResponse(
        services.transmitir(conversacion),
        content_type="text/event-stream",
    )
    respuesta["Cache-Control"] = "no-cache"
    # Evita que un proxy (nginx en Render) acumule la respuesta y arruine el streaming.
    respuesta["X-Accel-Buffering"] = "no"
    return respuesta
