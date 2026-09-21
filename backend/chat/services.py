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
from django.db.models import F

from chat.models import ChatQuota, Conversation, Message
from finanzas.contexto import finanzas_como_texto
from resume.contexto import hoja_de_vida_como_texto

logger = logging.getLogger(__name__)

SISTEMA = (
    "Eres un asistente conversacional. Responde en español, de forma clara y "
    "directa. Usa Markdown (listas, negritas, tablas y bloques de código) "
    "cuando ayude a entender la respuesta, pero no envuelvas la respuesta "
    "completa en un bloque de código: la interfaz ya la muestra con formato. "
    "Los bloques de código son solo para código. Si no sabes algo, dilo en vez "
    "de inventarlo.\n"
    "Sé concreto: ve directo a la respuesta, sin presentarte, sin repetir la "
    "pregunta y sin ofrecer más ayuda al final. Unas 150 palabras como "
    "máximo, salvo que te pidan código, y ahí manda el código con una o dos "
    "líneas de explicación. Si la pregunta es amplia, responde lo esencial y "
    "ofrece en una línea profundizar en un punto concreto."
)

# Instrucciones del chat de la hoja de vida. La hoja se pega debajo, leida de
# la base en ese momento.
SISTEMA_HOJA_DE_VIDA = """\
Eres el asistente de la hoja de vida que aparece abajo y respondes las
preguntas de quien la está leyendo (un reclutador, por ejemplo).

Reglas:
1. Responde únicamente con lo que dice la hoja de vida. No agregues
   experiencia, estudios, herramientas ni datos de contacto que no estén ahí,
   ni los deduzcas.
2. Si te preguntan algo del perfil que la hoja no menciona, dilo tal cual y
   ofrece lo más cercano que sí aparezca.
3. Si te preguntan cualquier otra cosa (noticias, código, tareas, opiniones,
   otras personas), responde que solo puedes hablar de esta hoja de vida e
   invita a preguntar por la experiencia, la formación o las herramientas.
4. Habla de la persona en tercera persona y en español.
5. Sé breve: 60 palabras como máximo, en un párrafo corto o en tres viñetas.
   Nada de introducciones ("claro que sí", "con gusto"), de repetir la
   pregunta ni de ofrecer más ayuda al final. Ve directo al dato. Markdown
   ligero (listas y negritas); nada de bloques de código.
6. No inventes fechas ni cifras: usa los períodos tal como están escritos."""

SIN_HOJA_DE_VIDA = (
    "Eres el asistente de una hoja de vida, pero todavía no hay ninguna "
    "cargada en la base de datos. Responde en español que por ahora no tienes "
    "la información del perfil y que lo intenten más tarde. No inventes datos "
    "ni respondas sobre otros temas."
)


# Instrucciones del asistente del dashboard de finanzas. Los datos se pegan
# debajo, leidos de la base en ese momento.
SISTEMA_FINANZAS = """\
Eres un asesor experto en finanzas personales. Respondes preguntas sobre los
gastos e ingresos que aparecen abajo, que son los de la persona que te habla.

Reglas:
1. Responde con los datos de abajo. Si la pregunta pide un dato que no está,
   dilo en una línea; no inventes cifras. Usa las cifras, rankings y
   diferencias tal como vienen calculadas; no las recalcules.
   "¿En qué gasto más?" es el concepto 1 del ranking del mes; "¿qué subió?"
   sale de la lista de cambios contra el mes pasado. No confundas las dos.
2. Puedes dar consejos de ahorro, presupuesto y control de gastos basados en
   esos datos. Si preguntan algo que no es de finanzas, di en una línea que
   solo hablas de sus finanzas.
3. Sé muy breve: 50 palabras como máximo. Una o dos frases, o tres viñetas
   cortas. Nada de saludos, de repetir la pregunta ni de ofrecer más ayuda.
4. Cifras en pesos con punto de miles, como en los datos ($ 1.234.567).
5. Habla de tú y en español."""

SIN_FINANZAS = (
    "Eres un asesor de finanzas personales, pero todavía no hay ningún gasto "
    "ni ingreso registrado. Responde en español, en una línea, que aún no hay "
    "datos y que registre sus movimientos para poder analizarlos."
)


def sistema_para(conversacion: Conversation) -> str:
    """
    Las instrucciones del modelo segun el alcance de la conversacion.

    En el chat de la hoja de vida se arma en cada mensaje con lo que hay en la
    base, para que el asistente responda con el CV recien editado sin tener
    que reiniciar nada.
    """
    if conversacion.scope == Conversation.Scope.FINANZAS:
        datos = finanzas_como_texto()
        if datos is None:
            return SIN_FINANZAS
        return f"{SISTEMA_FINANZAS}\n\n--- FINANZAS ---\n{datos}"

    if conversacion.scope != Conversation.Scope.RESUME:
        return SISTEMA

    hoja = hoja_de_vida_como_texto()
    if hoja is None:
        return SIN_HOJA_DE_VIDA

    return f"{SISTEMA_HOJA_DE_VIDA}\n\n--- HOJA DE VIDA ---\n{hoja}"


# Cuanta conversacion se le manda al modelo en cada turno.
MAX_MENSAJES = 20
MAX_CARACTERES_MENSAJE = 6000
MAX_CARACTERES_TOTAL = 24000

# El chat de la hoja de vida es un widget en una esquina de la pagina publica,
# no un asistente de proposito general: preguntas cortas, respuestas cortas y
# poca conversacion de arrastre. Cada turno manda la hoja de vida entera como
# contexto (~9.000 caracteres), asi que lo que se recorta aqui es lo que no se
# paga tres veces en la misma charla.
MAX_CARACTERES_RESUME = 300
MAX_MENSAJES_RESUME = 6
MAX_TOKENS_RESUME = 220

# El asistente de finanzas es igual de escueto: preguntas de una línea y
# respuestas de dos frases, con los datos del mes como contexto en cada turno.
MAX_CARACTERES_FINANZAS = 200
MAX_MENSAJES_FINANZAS = 6
MAX_TOKENS_FINANZAS = 180
# Aquí importan los datos exactos, no la creatividad: temperatura baja.
TEMPERATURA_FINANZAS = 0.2

# Alcances con preguntas cortas: el tope de caracteres se valida en la vista.
MAX_CARACTERES_POR_ALCANCE: dict[str, int] = {
    Conversation.Scope.RESUME: MAX_CARACTERES_RESUME,
    Conversation.Scope.FINANZAS: MAX_CARACTERES_FINANZAS,
}

# Tope de salida del asistente general. Menos que los 4096 configurados: las
# respuestas kilometricas cuestan y casi nunca se leen enteras. Alcanza para
# una consulta SQL con su explicacion.
MAX_TOKENS_GENERAL = 600

# Cuantos mensajes puede mandar un visitante en total, por alcance. `None` es
# sin tope. Se cuenta contra la tabla `ChatQuota`, que no se reinicia aunque
# borre sus conversaciones.
CUPO_POR_VISITANTE: dict[str, int | None] = {
    Conversation.Scope.GENERAL: 5,
    Conversation.Scope.RESUME: None,
    Conversation.Scope.FINANZAS: None,
}


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


def cupo_de(visitante: str, alcance: str) -> dict[str, int | None]:
    """
    Cuanto lleva gastado y cuanto le queda a un visitante.

    `limit` y `remaining` vienen en `None` cuando ese chat no tiene tope.
    """
    tope = CUPO_POR_VISITANTE.get(alcance)
    gastados = (
        ChatQuota.objects.filter(visitor=visitante, scope=alcance)
        .values_list("used", flat=True)
        .first()
        or 0
    )
    return {
        "used": gastados,
        "limit": tope,
        "remaining": None if tope is None else max(tope - gastados, 0),
    }


def gastar_del_cupo(visitante: str, alcance: str) -> None:
    """Suma un mensaje al contador del visitante."""
    if CUPO_POR_VISITANTE.get(alcance) is None:
        return

    fila, creada = ChatQuota.objects.get_or_create(
        visitor=visitante, scope=alcance, defaults={"used": 1}
    )
    if not creada:
        # `F` deja el incremento en la base: dos peticiones a la vez no se
        # pisan el contador.
        ChatQuota.objects.filter(pk=fila.pk).update(used=F("used") + 1)


def titulo_desde(texto: str) -> str:
    """Titulo corto de la conversacion, sacado del primer mensaje."""
    limpio = " ".join(texto.split())
    return limpio[:80] + ("…" if len(limpio) > 80 else "")


def historial_para_modelo(conversacion: Conversation) -> list[dict[str, str]]:
    """Ultimos mensajes de la conversacion, recortados a los limites."""
    if conversacion.scope == Conversation.Scope.RESUME:
        cuantos, tope = MAX_MENSAJES_RESUME, MAX_CARACTERES_RESUME
    elif conversacion.scope == Conversation.Scope.FINANZAS:
        cuantos, tope = MAX_MENSAJES_FINANZAS, MAX_CARACTERES_FINANZAS
    else:
        cuantos, tope = MAX_MENSAJES, MAX_CARACTERES_MENSAJE

    mensajes = [
        {"role": m.role, "content": m.content[:tope]}
        for m in conversacion.messages.all().order_by("-created_at", "-id")[:cuantos]
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

    def limite_de_salida(self, tope: int | None = None) -> dict[str, int]:
        """
        Cuanto puede responder el modelo.

        El nombre del parametro cambio en los modelos que razonan. `tope`
        permite pedir menos de lo configurado, que es lo que hace el chat de la
        hoja de vida para que las respuestas salgan cortas.
        """
        modelo = self.modelo.lower()
        nuevo = modelo.startswith(("o1", "o3", "o4", "gpt-5"))
        clave = "max_completion_tokens" if nuevo else "max_tokens"
        return {clave: min(tope or settings.CHAT_MAX_TOKENS, settings.CHAT_MAX_TOKENS)}


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
            {"role": "system", "content": sistema_para(conversacion)},
            *historial_para_modelo(conversacion),
        ],
        "temperature": (
            TEMPERATURA_FINANZAS
            if conversacion.scope == Conversation.Scope.FINANZAS
            else settings.CHAT_TEMPERATURE
        ),
        "top_p": 0.95,
        "stream": True,
        **proveedor.limite_de_salida(
            {
                Conversation.Scope.RESUME: MAX_TOKENS_RESUME,
                Conversation.Scope.FINANZAS: MAX_TOKENS_FINANZAS,
            }.get(conversacion.scope, MAX_TOKENS_GENERAL)
        ),
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
