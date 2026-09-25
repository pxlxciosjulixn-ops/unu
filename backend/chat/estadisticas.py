"""
Estadisticas de un chat de WhatsApp guardado: quien escribe mas, cuanto tarda
cada uno en responder, a que horas hablan y cuantos mensajes van por dia.

Todo sale del texto que ya esta en `AnalisisConversacion.contenido`, sin
llamar al modelo. El resumen en texto tambien va en las instrucciones del
consejero, para que sus consejos se apoyen en numeros y no en impresiones.
"""

from __future__ import annotations

import re
import statistics
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from chat import perfil as perfil_chat

# Una linea guardada: `[9/21/26 8:03:18 PM] sara: Holiii`.
_LINEA = re.compile(r"^\[(?P<fecha>[^\] ]+) (?P<hora>[^\]]+)\] (?P<resto>.*)$")
_HORA = re.compile(r"(\d{1,2}):(\d{2})(?::(\d{2}))?")

# Mas que esto entre dos mensajes no es "tardar en responder": es otra charla.
PAUSA_MAXIMA_RESPUESTA = timedelta(hours=12)
# Despues de esta pausa, quien escribe esta arrancando una conversacion nueva.
PAUSA_NUEVA_CONVERSACION = timedelta(hours=6)
# Con mas dias que esto la grafica por dia es ilegible: se agrupa por semana.
MAX_DIAS_POR_DIA = 90


@dataclass
class MensajeLeido:
    autor: str
    texto: str
    fecha: str
    hora: str
    momento: datetime | None = None


def mensajes_de(contenido: str) -> list[str]:
    """
    Los mensajes guardados, uno por elemento. Un mensaje de varias lineas
    sigue en las lineas que no empiezan con `[fecha hora]`.
    """
    mensajes: list[str] = []
    for linea in contenido.split("\n"):
        if _LINEA.match(linea) or not mensajes:
            mensajes.append(linea)
        else:
            mensajes[-1] += "\n" + linea
    return mensajes


def _leer(contenido: str) -> list[MensajeLeido]:
    leidos = []
    for mensaje in mensajes_de(contenido):
        linea = _LINEA.match(mensaje.split("\n", 1)[0])
        if not linea:
            continue
        autor, _, primera = linea["resto"].partition(": ")
        resto = mensaje.split("\n", 1)[1] if "\n" in mensaje else ""
        texto = primera + ("\n" + resto if resto else "")
        leidos.append(MensajeLeido(autor, texto, linea["fecha"], linea["hora"]))
    return leidos


def _partes_fecha(fecha: str) -> list[int] | None:
    partes = re.split(r"[/.-]", fecha)
    if len(partes) != 3 or not all(p.isdigit() for p in partes):
        return None
    return [int(p) for p in partes]


def _orden_de_fechas(leidos: list[MensajeLeido]) -> str:
    """
    `dmy`, `mdy` o `ymd`. WhatsApp escribe la fecha segun el idioma del
    telefono y no lo dice: se deduce de los valores. Un 21 en la primera
    posicion solo puede ser dia; en la segunda, solo puede ser dia tambien.
    Si nunca pasa de 12, el formato de 12 horas (AM/PM) delata a un telefono
    en ingles, que pone el mes primero.
    """
    partes = [p for m in leidos if (p := _partes_fecha(m.fecha))]
    if any(p[0] > 31 for p in partes):
        return "ymd"
    if any(p[0] > 12 for p in partes):
        return "dmy"
    if any(p[1] > 12 for p in partes):
        return "mdy"
    doce_horas = any(re.search(r"[ap]\.?\s?m", m.hora, re.I) for m in leidos)
    return "mdy" if doce_horas else "dmy"


def _momento(mensaje: MensajeLeido, orden: str) -> datetime | None:
    partes = _partes_fecha(mensaje.fecha)
    hora = _HORA.search(mensaje.hora)
    if partes is None or hora is None:
        return None
    if orden == "ymd":
        anio, mes, dia = partes
    elif orden == "mdy":
        mes, dia, anio = partes
    else:
        dia, mes, anio = partes
    if anio < 100:
        anio += 2000

    horas, minutos, segundos = int(hora[1]), int(hora[2]), int(hora[3] or 0)
    sufijo = re.sub(r"[\s.]", "", mensaje.hora.lower())
    if sufijo.endswith("pm") and horas < 12:
        horas += 12
    if sufijo.endswith("am") and horas == 12:
        horas = 0
    try:
        return datetime(anio, mes, dia, horas, minutos, segundos)
    except ValueError:
        return None


def _minutos(delta: timedelta) -> float:
    return round(delta.total_seconds() / 60, 1)


# Risas y emojis: "jaja", "jsjs", "xd", "jeje"... o cualquier emoji.
_RISA = re.compile(
    r"\b(ja(ja)+|je(je)+|ji(ji)+|js(js)+|ha(ha)+|xd+|lol|jsj\w*|kk+a\w*)\b"
    r"|[\U0001F300-\U0001FAFF☀-➿]",
    re.IGNORECASE,
)
# Hablar de verse o de hacer algo juntos.
_PLAN = re.compile(
    r"\b(vernos|nos vemos|salir|salimos|quedamos|te invito|vamos a|vamos al|"
    r"vamos por|plan|planes|cuando nos|podr[ií]amos|pasamos|caf[eé]|cine|"
    r"cena|almorzar|comer juntos|un d[ií]a de estos)\b",
    re.IGNORECASE,
)


# Emojis sueltos (sin los modificadores de tono de piel ni el selector 0xFE0F).
_EMOJI = re.compile(r"[🌀-🏺🐀-🫿☀-➿]")
_PALABRA = re.compile(r"[a-záéíóúñü]{3,}")

# Palabras que no dicen nada del chat: se sacan de "las más usadas".
_VACIAS = set("""
que de la el en los las un una por con para no es lo se me te mi tu su al del le
ya si pero como mas más muy bien esta está estoy eso esto yo tú vos ella él sus
nos hay ser fue son tambien también porque pues entonces solo sólo hoy aqui aquí
asi así todo toda todos nada algo cuando donde qué cómo cuál quién ahí alla allá
eres era estas estás estaba tengo tiene tienes tener hacer hace hago voy vas va
vamos dije dijo decir sea sí sii siii noo nooo xd jaja jajaja jajajaja jeje jsjs
ahora luego igual otra otro otros cosa cosas mismo misma creo sabes sabe bueno
buena ok okey dale vale pero pues osea ese esa esos esas este estos estas mucho
mucha poco poca sin sobre entre hasta desde les ella ellos ellas usted ustedes
omitido omitida multimedia sticker mensaje audio imagen video eliminó
""".split())

# Rangos para la grafica de tiempos de respuesta, en minutos.
_RANGOS_RESPUESTA = [
    ("< 1 min", 1),
    ("1–5 min", 5),
    ("5–30 min", 30),
    ("30 min–2 h", 120),
    ("2–12 h", 12 * 60),
]


def _rango(minutos: float) -> int:
    for i, (_, tope) in enumerate(_RANGOS_RESPUESTA):
        if minutos < tope:
            return i
    return len(_RANGOS_RESPUESTA) - 1


def _veces(n: int) -> str:
    return f"{n} vez" if n == 1 else f"{n} veces"


def _num(valor: float) -> str:
    """Decimal con coma, como se escribe en español: 4,2."""
    return str(valor).replace(".", ",")


def _otra_persona(participantes: list[dict], yo: str) -> dict | None:
    """Con quien habla `yo`: la que mas escribe de las demas (en un grupo)."""
    otras = [p for p in participantes if p["name"] != yo]
    return otras[0] if otras else None


def _rachas(leidos: list[MensajeLeido], autor: str) -> int:
    """Veces que `autor` manda tres o mas mensajes seguidos sin respuesta."""
    rachas, seguidos = 0, 0
    for mensaje in leidos:
        if mensaje.autor == autor:
            seguidos += 1
            if seguidos == 3:
                rachas += 1
        else:
            seguidos = 0
    return rachas


def _senales(
    leidos: list[MensajeLeido],
    participantes: list[dict],
    yo: str,
    perfil: dict,
) -> dict | None:
    """
    Nivel de interes de la otra persona (1 a 10) y las señales que lo
    explican, con reglas sobre los numeros del chat: no gasta tokens.

    Cada señal pesa distinto; el puntaje parte de 5 y sube o baja con ellas.
    Se muestran las tres mas fuertes de cada lado.
    """
    otra = _otra_persona(participantes, yo)
    mia = next((p for p in participantes if p["name"] == yo), None)
    if otra is None or mia is None:
        return None
    # Para mostrarlo: el export trae el nombre como lo guardo el telefono.
    ella = otra["name"][:1].upper() + otra["name"][1:]
    usted = mia

    a_favor: list[tuple[float, str]] = []
    en_contra: list[tuple[float, str]] = []

    def pct(valor: float) -> int:
        return round(valor * 100)

    # Quien escribe mas.
    if otra["share"] >= 0.45:
        a_favor.append((1.5, f"{ella} escribe tanto como usted ({pct(otra['share'])} % de los mensajes)."))
    elif otra["share"] < 0.35:
        en_contra.append((1.5, f"{ella} envía menos mensajes ({pct(otra['share'])} %) que usted ({pct(usted['share'])} %)."))

    # Que tan rapido contesta.
    tarda, tardo = otra["median_reply_minutes"], usted["median_reply_minutes"]
    if tarda is not None:
        if tarda <= 5:
            a_favor.append((1.5, f"{ella} le responde rápido: en {_duracion(tarda)} (mediana)."))
        elif tarda <= 30:
            a_favor.append((0.5, f"{ella} le responde en {_duracion(tarda)}, un tiempo normal."))
        elif tarda > 120:
            en_contra.append((1.5, f"{ella} tarda en responder: {_duracion(tarda)} (mediana)."))
        if tardo is not None and tarda > 15 and tarda > 2 * tardo:
            en_contra.append((1.0, f"Usted responde en {_duracion(tardo)}; {ella}, en {_duracion(tarda)}."))

    # Quien arranca las conversaciones.
    inicios = otra["starts"] + usted["starts"]
    if inicios >= 3:
        if otra["starts"] / inicios >= 0.4:
            a_favor.append((1.5, f"{ella} inicia la conversación {otra['starts']} de {inicios} veces."))
        elif otra["starts"] / inicios <= 0.2:
            en_contra.append((1.5, f"Usted inicia casi siempre ({usted['starts']} de {inicios} veces)."))

    # Preguntas: preguntar es querer seguir hablando.
    if otra["messages"] >= 5:
        tasa = otra["questions"] / otra["messages"]
        if tasa >= 0.15:
            a_favor.append((1.0, f"{ella} le hace preguntas ({otra['questions']} mensajes con pregunta)."))
        elif tasa < 0.05:
            en_contra.append((1.0, f"{ella} casi no le hace preguntas ({otra['questions']} en {otra['messages']} mensajes)."))

    # Risas y emojis.
    if otra["messages"] >= 5 and otra["laughs"] / otra["messages"] >= 0.15:
        a_favor.append((0.5, f"{ella} usa risas y emojis ({_veces(otra['laughs'])})."))

    # Planes para verse.
    if otra["plans"]:
        a_favor.append((1.5, f"{ella} habla de planes o de verse ({_veces(otra['plans'])})."))
    elif usted["plans"]:
        en_contra.append((1.0, f"Usted propone planes ({_veces(usted['plans'])}); {ella}, ninguno."))
    else:
        en_contra.append((0.5, "Ninguno de los dos propone planes para verse."))

    # Largo de los mensajes.
    if usted["words_avg"]:
        proporcion = otra["words_avg"] / usted["words_avg"]
        if proporcion >= 0.8:
            a_favor.append((0.5, f"Sus mensajes son igual de largos ({_num(otra['words_avg'])} contra {_num(usted['words_avg'])} palabras)."))
        elif proporcion <= 0.5:
            en_contra.append((1.0, f"{ella} responde corto: {_num(otra['words_avg'])} palabras por mensaje frente a {_num(usted['words_avg'])} suyas."))

    # Escribir varias veces seguidas sin que le contesten.
    rachas = _rachas(leidos, yo)
    if rachas >= 2:
        en_contra.append((1.0, f"Usted le escribe tres o más veces seguidas sin respuesta ({_veces(rachas)})."))

    # Si va de subida o de bajada.
    if len(leidos) >= 30:
        mitad = len(leidos) // 2
        antes = sum(m.autor == ella for m in leidos[:mitad]) / mitad
        ahora = sum(m.autor == ella for m in leidos[mitad:]) / (len(leidos) - mitad)
        if ahora - antes >= 0.1:
            a_favor.append((1.0, f"{ella} escribe más ahora que al principio."))
        elif antes - ahora >= 0.1:
            en_contra.append((1.0, f"{ella} escribe menos ahora que al principio."))

    # Lo ultimo del chat: mensajes suyos que nadie contesto.
    sin_respuesta = 0
    for mensaje in reversed(leidos):
        if mensaje.autor != yo:
            break
        sin_respuesta += 1
    if sin_respuesta >= 3:
        en_contra.append((1.0, f"Sus últimos {sin_respuesta} mensajes siguen sin respuesta."))

    # Lo que contó al importarlo: cuánto llevan hablando y si el chat es todo.
    dias = perfil_chat.dias_hablando(perfil)
    tiempo = perfil_chat.tiempo_en_palabras(dias) if dias is not None else ""
    if dias is not None and dias >= 30 and perfil.get("completo"):
        por_dia = len(leidos) / dias
        if por_dia < 1:
            en_contra.append((
                1.5,
                f"Llevan {tiempo} hablando y el chat completo tiene solo "
                f"{len(leidos)} mensajes: se escriben muy poco.",
            ))
        elif por_dia >= 10:
            a_favor.append((
                1.0,
                f"En {tiempo} han cruzado {len(leidos)} mensajes: hablan casi a diario.",
            ))

    favor = sum(peso for peso, _ in a_favor)
    contra = sum(peso for peso, _ in en_contra)
    puntaje = min(max(round(5 + (favor - contra) * 0.8), 1), 10)

    if puntaje >= 8:
        resumen = f"Hay mucho interés de parte de {ella}."
    elif puntaje >= 6:
        resumen = f"{ella} muestra interés, aunque hay cosas por mejorar."
    elif puntaje >= 4:
        resumen = "Interés tibio: hay señales para los dos lados."
    else:
        resumen = f"Por ahora, poco interés de parte de {ella}."

    # Mucho tiempo con interés tibio también es un dato: se dice.
    if dias is not None and dias >= 180 and puntaje <= 5:
        resumen += f" Y ya llevan {tiempo}: vale la pena preguntarse si seguir insistiendo."

    def mejores(senales: list[tuple[float, str]]) -> list[str]:
        return [texto for _, texto in sorted(senales, key=lambda s: -s[0])[:3]]

    return {
        "score": puntaje,
        "summary": resumen,
        "other": ella,
        "for": mejores(a_favor),
        "against": mejores(en_contra),
    }


def calcular(contenido: str, yo: str = "Tú", perfil: dict | None = None) -> dict | None:
    """
    Estadisticas del chat, o `None` si no hay mensajes con fecha legible.

    `yo` es quien subio el chat ("Tú" en los export de iPhone en español; en
    otros telefonos sale su nombre). Con el se sabe quien es "la otra persona"
    para el nivel de interes.
    """
    leidos = _leer(contenido)
    orden = _orden_de_fechas(leidos)
    for mensaje in leidos:
        mensaje.momento = _momento(mensaje, orden)
    leidos = [m for m in leidos if m.momento is not None]
    if not leidos:
        return None

    por_autor: dict[str, list[MensajeLeido]] = defaultdict(list)
    for mensaje in leidos:
        por_autor[mensaje.autor].append(mensaje)

    respuestas: dict[str, list[float]] = defaultdict(list)
    inicios: Counter[str] = Counter()
    for anterior, actual in zip([None, *leidos], leidos):
        if anterior is None:
            inicios[actual.autor] += 1
            continue
        pausa = actual.momento - anterior.momento
        if pausa >= PAUSA_NUEVA_CONVERSACION:
            inicios[actual.autor] += 1
        if actual.autor != anterior.autor and pausa <= PAUSA_MAXIMA_RESPUESTA:
            respuestas[actual.autor].append(_minutos(pausa))

    total = len(leidos)
    participantes = [
        {
            "name": autor,
            "is_me": autor == yo,
            "messages": len(mensajes),
            "share": round(len(mensajes) / total, 3),
            "words_avg": round(
                sum(len(m.texto.split()) for m in mensajes) / len(mensajes), 1
            ),
            "median_reply_minutes": (
                statistics.median(respuestas[autor]) if respuestas[autor] else None
            ),
            "starts": inicios[autor],
            "questions": sum("?" in m.texto for m in mensajes),
            "laughs": sum(bool(_RISA.search(m.texto)) for m in mensajes),
            "plans": sum(bool(_PLAN.search(m.texto)) for m in mensajes),
        }
        for autor, mensajes in sorted(
            por_autor.items(), key=lambda par: len(par[1]), reverse=True
        )
    ]
    otra = _otra_persona(participantes, yo)

    primero, ultimo = leidos[0].momento.date(), leidos[-1].momento.date()
    dias_totales = (ultimo - primero).days + 1
    conteo_dia: Counter[date] = Counter()
    conteo_dia_mio: Counter[date] = Counter()
    for mensaje in leidos:
        conteo_dia[mensaje.momento.date()] += 1
        if mensaje.autor == yo:
            conteo_dia_mio[mensaje.momento.date()] += 1

    semanal = dias_totales > MAX_DIAS_POR_DIA

    def clave(dia: date) -> date:
        return dia - timedelta(days=dia.weekday()) if semanal else dia

    serie: dict[date, list[int]] = {}
    cursor = clave(primero)
    paso = timedelta(days=7 if semanal else 1)
    while cursor <= ultimo:
        serie[cursor] = [0, 0]
        cursor += paso
    for dia, cuantos in conteo_dia.items():
        mios = conteo_dia_mio[dia]
        serie[clave(dia)][0] += mios
        serie[clave(dia)][1] += cuantos - mios

    horas = [0] * 24
    dias_semana = [0] * 7
    mapa = [[0] * 24 for _ in range(7)]
    for mensaje in leidos:
        horas[mensaje.momento.hour] += 1
        dias_semana[mensaje.momento.weekday()] += 1
        mapa[mensaje.momento.weekday()][mensaje.momento.hour] += 1

    # Cuantas respuestas de cada uno caen en cada rango de tiempo.
    tiempos = {
        autor: [0] * len(_RANGOS_RESPUESTA) for autor in por_autor
    }
    for autor, minutos in respuestas.items():
        for valor in minutos:
            tiempos[autor][_rango(valor)] += 1

    palabras: dict[str, Counter[str]] = defaultdict(Counter)
    emojis: Counter[str] = Counter()
    emojis_por_autor: dict[str, Counter[str]] = defaultdict(Counter)
    for mensaje in leidos:
        for palabra in _PALABRA.findall(mensaje.texto.lower()):
            if palabra not in _VACIAS and not _RISA.fullmatch(palabra):
                palabras[mensaje.autor][palabra] += 1
        for emoji in _EMOJI.findall(mensaje.texto):
            emojis[emoji] += 1
            emojis_por_autor[mensaje.autor][emoji] += 1

    return {
        "total_messages": total,
        "first": leidos[0].momento.isoformat(),
        "last": leidos[-1].momento.isoformat(),
        "span_days": dias_totales,
        "active_days": len(conteo_dia),
        "avg_per_active_day": round(total / len(conteo_dia), 1),
        "busiest_hour": max(range(24), key=lambda h: horas[h]),
        "me": yo,
        "me_known": any(p["is_me"] for p in participantes),
        "other": otra["name"] if otra else None,
        "participants": participantes,
        "granularity": "week" if semanal else "day",
        # `me`: mensajes de quien subio el chat; `others`: los de los demas.
        "series": [
            {"date": d.isoformat(), "me": mios, "others": otros}
            for d, (mios, otros) in serie.items()
        ],
        "hours": horas,
        # De lunes (0) a domingo (6).
        "weekdays": dias_semana,
        # Mensajes por dia de la semana (filas, lunes primero) y hora (columnas).
        "heatmap": mapa,
        "reply_buckets": [nombre for nombre, _ in _RANGOS_RESPUESTA],
        # Por persona: cuantas de sus respuestas caen en cada rango.
        "reply_times": tiempos,
        "top_words": {
            autor: [{"word": w, "count": c} for w, c in contador.most_common(8)]
            for autor, contador in palabras.items()
        },
        "top_emojis": [{"emoji": e, "count": c} for e, c in emojis.most_common(10)],
        "interest": _senales(leidos, participantes, yo, perfil or {}),
        "days_talking": perfil_chat.dias_hablando(perfil or {}),
    }


def _duracion(minutos: float | None) -> str:
    if minutos is None:
        return "sin datos"
    if minutos < 1:
        return "menos de un minuto"
    if minutos < 60:
        return f"{round(minutos)} min"
    return f"{_num(round(minutos / 60, 1))} h"


def como_texto(datos: dict | None) -> str:
    """Resumen de las estadisticas para las instrucciones del modelo."""
    if not datos:
        return "Sin estadísticas: no se pudieron leer las fechas del chat."
    lineas = [
        f"Mensajes: {datos['total_messages']} en {datos['span_days']} días "
        f"({datos['active_days']} con mensajes, {datos['avg_per_active_day']} por día activo).",
        f"Hora con más mensajes: {datos['busiest_hour']}:00.",
    ]
    for p in datos["participants"]:
        lineas.append(
            f"- {p['name']}{' (quien te escribe)' if p['is_me'] else ''}: "
            f"{p['messages']} mensajes ({round(p['share'] * 100)} %), "
            f"{p['words_avg']} palabras por mensaje, responde en "
            f"{_duracion(p['median_reply_minutes'])} (mediana), "
            f"inicia la conversación {p['starts']} veces, "
            f"{p['questions']} mensajes con pregunta, {p['plans']} con planes."
        )
    interes = datos.get("interest")
    if interes:
        lineas.append(
            f"Nivel de interés calculado de {interes['other']}: {interes['score']}/10. "
            f"A favor: {' '.join(interes['for']) or 'nada claro'} "
            f"En contra: {' '.join(interes['against']) or 'nada claro'}"
        )
    return "\n".join(lineas)
