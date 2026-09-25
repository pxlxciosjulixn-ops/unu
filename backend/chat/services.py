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

from chat import estadisticas
from chat import perfil as perfil_chat
from chat.models import (
    AjustesConsejero,
    ChatQuota,
    Conversation,
    Message,
    PreferenciaVisitante,
)
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


# Lo que responde el chat cuando le preguntan algo que no es un chat de
# WhatsApp cargado. Sin archivo se manda tal cual, sin llamar al modelo.
RESPUESTA_FUERA_DE_TEMA = (
    "Sapa hijueputa, este chat fue creado por Julian para leer y dar consejos "
    "sobre conversaciones, no para sus maricadas."
)
# La misma idea para quien eligio el nivel suave, que no lleva groserias.
RESPUESTA_FUERA_DE_TEMA_SUAVE = (
    "Este chat fue creado por Julian para leer y dar consejos sobre "
    "conversaciones. Sube un chat de WhatsApp y te ayudo con eso."
)

GROSERIAS = (
    '"pirobo", "sapa hp", "sapa hijueputa", "gonorrea", "malparido" o '
    '"malparida", "perra", "idiota", "imbécil", "mísero" o "mísera"'
)

# Las de "sin filtro": las de siempre y las que pidió Julian. Van escritas en
# masculino; se ajustan al género de a quién se le dicen.
GROSERIAS_SIN_FILTRO = GROSERIAS + (
    ', "pirobo irrespetuoso", "qué pirobo tan imbécil", "qué pirobo tan '
    'marica", "pirobo rogándole a una vieja" (para quien le ruega a alguien), '
    '"becerro hijueputa", "setenta hijueputa", "hijo de la grandísima perra", '
    '"cacorro", "zunga", "zorra", "moje cuco loca hijueputa", "qué visaje" '
    '(cuando algo está raro o sospechoso) y "qué boleta" (cuando algo da pena '
    'ajena)'
)

_USTED = (
    'A quien te escribe lo tratas de usted, nunca de tú: "mire", "usted", '
    '"le", "su", "haga", "pregúntele", "no sea". Nada de "mira", "tú", "te", '
    '"tu", "haz" ni "pregúntale".'
)

# Como habla el consejero segun el nivel que eligio el visitante en ajustes.
# `minimo` es cuantas groserias se le exige revisar antes de terminar.
NIVELES_DE_GROSERIA = {
    "suave": {
        "minimo": 0,
        "trato": (
            "A quien te escribe lo tratas de tú, con calidez: atento, amable y "
            "paciente, como un buen amigo que se preocupa. Pero habla normal: "
            'nada de apodos cariñosos ("amor", "cariño", "corazón", "linda", '
            '"bebé", "mi vida") ni diminutivos empalagosos.'
        ),
        "regla": "No dices ninguna grosería, ni suave.",
        "ejemplo": (
            "Mira, ella te responde, pero corto y sin hacerte preguntas: eso "
            "es un interés tibio. Tú le escribes el doble y eso puede sonar a "
            "que estás ansioso. Dale un toque más personal y pregúntale cosas "
            "que la hagan abrirse más; si no cambia, no te desgastes."
        ),
        "fuera_de_tema": RESPUESTA_FUERA_DE_TEMA_SUAVE,
        "verificacion": "que no tenga ninguna grosería",
    },
    "normal": {
        "minimo": 1,
        "trato": _USTED,
        "regla": (
            "Eres algo grosero, sin exagerar: una o dos groserías por "
            f"respuesta, y solo de estas: {GROSERIAS}. El resto del texto va "
            "serio."
        ),
        "ejemplo": (
            "Mire, ella le responde, pero corto y sin hacerle preguntas: eso "
            "es interés tibio. Usted le escribe el doble, pirobo, y así "
            "parece desesperado. Dele un toque más personal y pregúntele cosas "
            "que la hagan abrirse más."
        ),
        "fuera_de_tema": RESPUESTA_FUERA_DE_TEMA,
        "verificacion": "que tenga al menos una grosería de la lista (y máximo dos)",
    },
    "sin_filtro": {
        "minimo": 6,
        "trato": _USTED,
        "regla": (
            "No tienes filtro: eres super grosero, casi cada frase lleva una "
            f"grosería, seis o más por respuesta, y solo de estas: "
            f"{GROSERIAS_SIN_FILTRO}. Varíalas y no repitas la misma dos veces "
            "seguidas. Estas sí se permiten aunque sean colombianas. Ajusta el "
            "género: a una mujer se le dice piroba, malparida, becerra, hija de "
            "la grandísima perra; a un hombre, pirobo, malparido, becerro. Por "
            "grosero que seas, el consejo tiene que ser bueno, concreto y "
            "servir para solucionar: la grosería es la forma, no el fondo."
        ),
        "ejemplo": (
            "Qué visaje, pirobo: esa sapa hp le responde corto y sin hacerle "
            "preguntas, gonorrea, y eso es interés tibio. Usted le escribe el "
            "doble, qué pirobo tan imbécil, y rogándole a una vieja así da "
            "boleta. Malparido, haga esto: deje de escribirle dos días y "
            "cuando vuelva, pregúntele algo de lo que ella sí habla, como su "
            "trabajo. Si sigue igual de seca, setenta hijueputa, suéltela."
        ),
        "fuera_de_tema": RESPUESTA_FUERA_DE_TEMA,
        "verificacion": "que tenga al menos seis groserías de la lista",
    },
}

NIVEL_POR_DEFECTO = "sin_filtro"


def nivel_de_groseria(groseria: str) -> dict:
    return NIVELES_DE_GROSERIA.get(groseria, NIVELES_DE_GROSERIA[NIVEL_POR_DEFECTO])


# Quién da el consejo. Cambia la voz y el enfoque; el trato (tú o usted) y
# las groserías siguen saliendo del nivel que eligió el visitante.
PERSONALIDADES = {
    "consejero": (
        "Eres un consejero de relaciones directo: analizas el chat y vas al "
        "grano con lo que conviene hacer."
    ),
    "amigo": (
        "Eres su mejor amigo sincero: le hablas con confianza y cariño, le "
        "dices la verdad aunque duela y lo apoyas. Usas ejemplos cotidianos, "
        "como si estuvieran tomando algo."
    ),
    "psicologo": (
        "Eres un psicólogo: calmado y sin juzgar. Hablas de emociones, "
        "necesidades y patrones que se repiten en el chat, validas lo que "
        "siente y terminas con una pregunta que lo haga reflexionar."
    ),
    "abuela": (
        "Eres su abuela: sabia, directa y cariñosa a tu manera. Hablas con "
        'dichos y refranes, cuentas cómo era "en mis tiempos" y le das '
        "consejos de toda la vida. Lo llamas mijo o mija."
    ),
    "coach": (
        "Eres un coach de conquista: estratégico y con mucha energía. Das "
        "pasos concretos y numerados (qué escribir, cuándo, qué no hacer) y "
        "motivas a pasar a la acción."
    ),
    "chismosa": (
        "Eres su mejor amiga chismosa: reaccionas con drama y emoción "
        '("¡NO LO PUEDO CREER!", "espera, espera"), analizas cada detalle del '
        "chat como si fuera una novela y das tu opinión sin filtro."
    ),
}

PERSONALIDAD_POR_DEFECTO = "consejero"


def sistema_consejos(
    groseria: str, max_caracteres: int, personalidad: str = PERSONALIDAD_POR_DEFECTO
) -> str:
    """
    Instrucciones del consejero de relaciones. El chat de WhatsApp que eligio
    el visitante (y sus estadisticas) se pega debajo, leido de la base.
    """
    nivel = nivel_de_groseria(groseria)
    tutea = groseria == "suave"
    quien = PERSONALIDADES.get(personalidad, PERSONALIDADES[PERSONALIDAD_POR_DEFECTO])
    return f"""\
{quien} Te especializas en relaciones (amor, conquista, pareja, amistad y
familia) y te creó Julian Palacios. Abajo está un chat de WhatsApp exportado
con sus estadísticas. Arriba del chat se indica cómo aparece en él quien te
escribe y qué relación tiene con la otra persona: enfoca todos tus consejos en
ese tipo de relación (no se aconseja igual a una pareja que a un amigo o a un
familiar).

Forma de hablar:
- Mantén siempre tu personalidad, pero habla en español neutro y con
  palabras sencillas. Nada de regionalismos ni jerga: no uses "parce",
  "parcero", "a lo bien", "bacano", "qué más" ni nada con acento de un país,
  salvo las groserías que se te permiten abajo.
- {nivel['trato']}
- {nivel['regla']}{'' if tutea else ' Concuerda el género con la persona. Pueden ir para quien te escribe o para la otra persona del chat, según venga al caso.'}
- Ejemplo del tono: "{nivel['ejemplo']}"

Reglas:
1. Solo hablas del chat de abajo y de cómo le va a quien te escribe en esa
   relación. Si te preguntan cualquier otra cosa (código, tareas, noticias,
   recetas, lo que sea que no sea el chat), responde exactamente esto y nada
   más: "{nivel['fuera_de_tema']}"
2. Basa los consejos en lo que muestra el chat y en sus estadísticas: quién
   escribe más, cuánto tarda cada uno en responder, quién inicia, el tono,
   los temas. Cita cifras, mensajes cortos o fechas concretas como prueba.
3. Sé honesto: si las señales son tibias o negativas, dilo sin endulzarlo.
   No inventes lo que el chat no dice ni afirmes lo que la otra persona
   siente: habla de señales.
4. Da consejos prácticos: qué escribir, cuándo, qué evitar. Si te piden un
   mensaje para mandar, redáctalo con el estilo de "Tú" en el chat (ahí sí
   como él le habla a ella) y sin groserías, que ese es para la otra persona.
5. Si te piden revisar un mensaje antes de mandarlo, responde así:
   **Veredicto:** intenso, seco o bien (una sola palabra), luego en una o dos
   frases por qué, comparándolo con cómo viene el chat, y al final
   **Mejor así:** con una versión mejorada del mensaje, sin groserías y con
   el estilo de "Tú". Si llevas groserías, van en el veredicto y la
   explicación, nunca dentro del mensaje mejorado.
6. Nada de manipulación, presión, celos ni control. Si ves señales de
   maltrato o de riesgo, dilo en serio y sin groserías.
7. Tu respuesta completa no puede pasar de {max_caracteres} caracteres,
   contando espacios: ve directo a lo más importante. Markdown ligero
   (negritas). Nada de saludos ni de repetir la pregunta.
8. Obligatorio: antes de terminar, revisa {nivel['verificacion']}, que
   {'tutee' if tutea else 'no tutee'} a quien te escribe y que no pase de
   {max_caracteres} caracteres. Si falla algo de eso, está mal: corrígelo."""


SIN_CONSEJOS = (
    "Eres un consejero de relaciones grosero, pero el chat de WhatsApp que se "
    "usaba como contexto en esta conversación ya fue borrado. Responde en "
    "español neutro, sin regionalismos, en una línea y con una grosería "
    "(gonorrea, pirobo, sapa hp, idiota) y tratando de usted, sin tutear, "
    "que no tienes el chat y que suba el archivo de nuevo y abra una "
    "conversación con él."
)

# Del chat se manda lo mas reciente: es lo que mas pesa para un consejo y asi
# un historial de años no revienta el contexto del modelo ni la cuota.
MAX_CARACTERES_CHAT_CONTEXTO = 40000


def personalidad_de(visitante: str) -> str:
    """La personalidad que eligio el visitante; el consejero si no eligio."""
    return (
        PreferenciaVisitante.objects.filter(visitor=visitante)
        .values_list("personalidad", flat=True)
        .first()
        or PERSONALIDAD_POR_DEFECTO
    )


def groseria_de(visitante: str) -> str:
    """El nivel de groserias que eligio el visitante; sin filtro si no eligio."""
    return (
        PreferenciaVisitante.objects.filter(visitor=visitante)
        .values_list("groseria", flat=True)
        .first()
        or NIVEL_POR_DEFECTO
    )


def tokens_para(max_caracteres: int) -> int:
    """
    Tope de tokens para que quepa una respuesta de `max_caracteres`. En
    español un token son unos 3,5 caracteres; se deja margen para que el tope
    no corte la frase a la mitad (el largo real lo pone la instruccion).
    """
    return int(max_caracteres / 2.5) + 60


# Lo que significa cada relacion para el consejero.
_RELACIONES = {
    "amistad": "amistad (es su amigo o amiga)",
    "pareja": "pareja (ya son novios o pareja)",
    "me_gusta": "le gusta esa persona y quiere conquistarla",
    "amante": "amantes (una relación a escondidas o sin compromiso)",
    "ex": "expareja",
    "familia": "familiar",
    "trabajo": "compañeros de trabajo o de estudio",
    "otra": "otra",
}


def relacion_como_texto(analisis) -> str:
    return _RELACIONES.get(analisis.relacion, "no la indicó; dedúcela del chat")


def chat_como_contexto(analisis) -> str:
    """El chat guardado, recortado a sus ultimas lineas si es muy largo."""
    contenido = analisis.contenido
    recortado = len(contenido) > MAX_CARACTERES_CHAT_CONTEXTO
    if recortado:
        contenido = contenido[-MAX_CARACTERES_CHAT_CONTEXTO:]
        # Empieza en un mensaje completo, no a mitad de linea.
        contenido = contenido[contenido.find("\n") + 1 :]

    cabecera = [
        f"Archivo: {analisis.nombre}",
        f"Participantes: {', '.join(analisis.participantes)}",
        f"Periodo: {analisis.desde} a {analisis.hasta}",
        f"Mensajes: {analisis.total_mensajes}",
        "",
        f'Quien te escribe aparece en el chat como: "{analisis.yo}"',
        f"Relación con la otra persona: {relacion_como_texto(analisis)}",
        "Lo que contó sobre esa relación:",
        perfil_chat.como_texto(analisis.perfil or {}, analisis.total_mensajes),
        "",
        "Estadísticas (calculadas del chat completo):",
        estadisticas.como_texto(
            estadisticas.calcular(analisis.contenido, analisis.yo, analisis.perfil)
        ),
    ]
    if recortado:
        cabecera.append("(Por su tamaño, abajo van solo los mensajes más recientes.)")
    return "\n".join(cabecera) + "\n\n" + contenido


def sistema_para(conversacion: Conversation) -> str:
    """
    Las instrucciones del modelo segun el alcance de la conversacion.

    En el chat de la hoja de vida se arma en cada mensaje con lo que hay en la
    base, para que el asistente responda con el CV recien editado sin tener
    que reiniciar nada.
    """
    if conversacion.scope == Conversation.Scope.CONSEJOS:
        # Oculto por el visitante cuenta como borrado: sigue en la base, pero
        # el ya no lo quiere en sus conversaciones.
        if conversacion.analisis is None or conversacion.analisis.borrado_en:
            return SIN_CONSEJOS
        chat = chat_como_contexto(conversacion.analisis)
        instrucciones = sistema_consejos(
            groseria_de(conversacion.visitor),
            AjustesConsejero.actuales().max_caracteres,
            personalidad_de(conversacion.visitor),
        )
        return f"{instrucciones}\n\n--- CHAT DE WHATSAPP ---\n{chat}"

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

# El consejero manda el chat de WhatsApp entero como contexto en cada turno:
# las preguntas pueden ser largas (a veces pegan un mensaje para revisar),
# pero la charla de arrastre se corta antes.
MAX_CARACTERES_CONSEJOS = 1500
MAX_MENSAJES_CONSEJOS = 10
# El largo de sus respuestas no es fijo: sale de `AjustesConsejero`, que se
# cambia en la rueda de la pagina con la clave de ajustes.

# Alcances con preguntas cortas: el tope de caracteres se valida en la vista.
MAX_CARACTERES_POR_ALCANCE: dict[str, int] = {
    Conversation.Scope.RESUME: MAX_CARACTERES_RESUME,
    Conversation.Scope.FINANZAS: MAX_CARACTERES_FINANZAS,
    Conversation.Scope.CONSEJOS: MAX_CARACTERES_CONSEJOS,
}

# Tope de salida del asistente general. Menos que los 4096 configurados: las
# respuestas kilometricas cuestan y casi nunca se leen enteras. Alcanza para
# una consulta SQL con su explicacion.
MAX_TOKENS_GENERAL = 600

# Cuantos mensajes puede mandar un visitante en total, por alcance. `None` es
# sin tope. Se cuenta contra la tabla `ChatQuota`, que no se reinicia aunque
# borre sus conversaciones.
CUPO_POR_VISITANTE: dict[str, int | None] = {
    # Sin chat de WhatsApp, /chatbot responde una frase fija sin llamar al
    # modelo: no gasta cuota, asi que no necesita tope.
    Conversation.Scope.GENERAL: None,
    Conversation.Scope.RESUME: None,
    Conversation.Scope.FINANZAS: None,
    Conversation.Scope.CONSEJOS: 30,
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
    if PreferenciaVisitante.objects.filter(visitor=visitante, sin_limite=True).exists():
        tope = None
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
    if cupo_de(visitante, alcance)["limit"] is None:
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
    elif conversacion.scope == Conversation.Scope.CONSEJOS:
        cuantos, tope = MAX_MENSAJES_CONSEJOS, MAX_CARACTERES_CONSEJOS
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

    if conversacion.scope == Conversation.Scope.GENERAL:
        # /chatbot solo sirve con un chat de WhatsApp cargado: sin el, la
        # respuesta es siempre la misma y no vale la pena pagarla al modelo.
        frase = nivel_de_groseria(groseria_de(conversacion.visitor))["fuera_de_tema"]
        guardado = Message.objects.create(
            conversation=conversacion,
            role=Message.Role.ASSISTANT,
            content=frase,
        )
        conversacion.save(update_fields=["updated_at"])
        yield _evento("delta", text=frase)
        yield _evento("done", text=frase, message_id=guardado.id)
        return

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
                Conversation.Scope.CONSEJOS: tokens_para(
                    AjustesConsejero.actuales().max_caracteres
                ),
            }.get(conversacion.scope, MAX_TOKENS_GENERAL)
        ),
        **proveedor.extras(),
    }

    partes: list[str] = []
    guardado = False
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

        # Se guarda antes de avisar: el id viaja en "done" y con él la página
        # puede pedir el "¿te sirvió?" de esta respuesta.
        mensaje = Message.objects.create(
            conversation=conversacion,
            role=Message.Role.ASSISTANT,
            content="".join(partes).strip(),
        )
        conversacion.save(update_fields=["updated_at"])
        guardado = True
        yield _evento("done", text="".join(partes), message_id=mensaje.id)

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
        if texto and not guardado:
            Message.objects.create(
                conversation=conversacion,
                role=Message.Role.ASSISTANT,
                content=texto,
            )
            conversacion.save(update_fields=["updated_at"])
