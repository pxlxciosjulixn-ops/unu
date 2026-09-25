"""
El contexto que da quien importa un chat: preguntas según la relación (qué
familiar es, si ya se conocen en persona…), desde cuándo hablan y si el
archivo es toda la conversación.

Las preguntas las arma el frontend; aquí se guardan tal cual se mostraron
(pregunta y respuesta en texto), así el consejero las lee sin tener que saber
el catálogo.
"""

from __future__ import annotations

from datetime import date

MAX_RESPUESTAS = 10
MAX_TEXTO = 200


class PerfilInvalido(ValueError):
    pass


def limpiar(datos: object, hoy: date | None = None) -> dict:
    """Valida y recorta lo que llega del navegador."""
    if datos in (None, ""):
        return {}
    if not isinstance(datos, dict):
        raise PerfilInvalido("El contexto del chat no es válido.")
    hoy = hoy or date.today()

    respuestas = []
    for item in (datos.get("respuestas") or [])[:MAX_RESPUESTAS]:
        if not isinstance(item, dict):
            continue
        pregunta = str(item.get("pregunta") or "").strip()[:MAX_TEXTO]
        respuesta = str(item.get("respuesta") or "").strip()[:MAX_TEXTO]
        if pregunta and respuesta:
            respuestas.append({"pregunta": pregunta, "respuesta": respuesta})

    limpio: dict = {"respuestas": respuestas}

    if datos.get("desde"):
        try:
            desde = date.fromisoformat(str(datos["desde"]))
        except ValueError as exc:
            raise PerfilInvalido("La fecha no es válida.") from exc
        if desde > hoy:
            raise PerfilInvalido("La fecha no puede ser en el futuro.")
        limpio["desde"] = desde.isoformat()

    if isinstance(datos.get("completo"), bool):
        limpio["completo"] = datos["completo"]
    return limpio


def dias_hablando(perfil: dict, hoy: date | None = None) -> int | None:
    """Días desde que empezaron a hablar, según la fecha que dio."""
    if not perfil.get("desde"):
        return None
    return ((hoy or date.today()) - date.fromisoformat(perfil["desde"])).days


def tiempo_en_palabras(dias: int) -> str:
    """258 → "8 meses y 18 días"; 400 → "1 año y 1 mes"."""
    if dias < 31:
        return "1 día" if dias == 1 else f"{dias} días"
    anios, resto = divmod(dias, 365)
    meses, dias_sueltos = divmod(resto, 30)
    partes = []
    if anios:
        partes.append("1 año" if anios == 1 else f"{anios} años")
    if meses:
        partes.append("1 mes" if meses == 1 else f"{meses} meses")
    if not anios and dias_sueltos:
        partes.append("1 día" if dias_sueltos == 1 else f"{dias_sueltos} días")
    return " y ".join(partes)


def como_texto(perfil: dict, total_mensajes: int, hoy: date | None = None) -> str:
    """Lo que contó, en líneas, para las instrucciones del consejero."""
    lineas = [f"- {r['pregunta']} {r['respuesta']}" for r in perfil.get("respuestas", [])]
    dias = dias_hablando(perfil, hoy)
    if dias is not None:
        lineas.append(
            f"- Hablan desde el {perfil['desde']}: llevan {tiempo_en_palabras(dias)} "
            f"({dias} días)."
        )
    if perfil.get("completo") is True:
        lineas.append(
            f"- El archivo es TODA la conversación que han tenido: {total_mensajes} "
            "mensajes en total."
        )
    elif perfil.get("completo") is False:
        lineas.append("- El archivo es solo una parte de la conversación.")
    return "\n".join(lineas) if lineas else "- No contó nada más."
