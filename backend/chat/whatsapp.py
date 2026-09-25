"""
Lectura de los chats que exporta WhatsApp ("Exportar chat" > "Sin archivos").

El export es un .txt con un mensaje por linea, y los mensajes largos siguen en
las lineas de abajo. Cambia segun el telefono:

- iPhone:  `[9/21/26, 8:03:18 PM] sara: Holiii`
- Android: `21/9/26, 20:03 - sara: Holiii`

De ahi se queda lo que sirve para dar un consejo: quien dijo que y cuando. Los
avisos del sistema (cifrado, llamadas, cambios de numero) y los adjuntos
omitidos (stickers, audios, fotos) son ruido y gastan tokens, asi que se van.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# Fecha y hora al comienzo de la linea, con o sin corchetes.
_INICIO = re.compile(
    r"^\[?(?P<fecha>\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4}),?\s+"
    r"(?P<hora>\d{1,2}:\d{2}(?::\d{2})?(?:\s?[ap]\.?\s?m\.?)?)\]?"
    r"\s*(?:-\s*)?(?P<resto>.*)$",
    re.IGNORECASE,
)

# WhatsApp mete marcas de direccion invisibles alrededor de nombres y adjuntos.
_INVISIBLES = dict.fromkeys(map(ord, "‎‏‪‬ ﻿"), None)

# Adjuntos que no vienen en el export: "<sticker omitido>", "imagen omitida",
# "<Media omitted>", "audio omitido"...
_OMITIDO = re.compile(r"^<?[^<>]{0,40}\b(omitid[oa]s?|omitted)>?$", re.IGNORECASE)

_SISTEMA = (
    "cifrados de extremo a extremo",
    "end-to-end encrypted",
    "esperando el mensaje",
    "waiting for this message",
    "se eliminó este mensaje",
    "eliminaste este mensaje",
    "this message was deleted",
)


class ChatInvalido(ValueError):
    """El archivo no parece un chat exportado de WhatsApp."""


@dataclass
class ChatLeido:
    lineas: list[str] = field(default_factory=list)
    participantes: list[str] = field(default_factory=list)
    desde: str = ""
    hasta: str = ""

    @property
    def contenido(self) -> str:
        return "\n".join(self.lineas)


def decodificar(datos: bytes) -> str:
    """El texto del archivo: UTF-8 casi siempre, Latin-1 si viene de Windows."""
    try:
        return datos.decode("utf-8-sig")
    except UnicodeDecodeError:
        return datos.decode("latin-1")


def _es_ruido(texto: str) -> bool:
    minusculas = texto.lower()
    return bool(_OMITIDO.match(texto)) or any(s in minusculas for s in _SISTEMA)


def leer_chat(texto: str) -> ChatLeido:
    """
    Convierte el export en lineas `[fecha hora] autor: mensaje`.

    Lanza `ChatInvalido` si ninguna linea tiene la forma de un mensaje: asi un
    .txt cualquiera no termina guardado como si fuera una conversacion.
    """
    mensajes: list[list[str]] = []  # [fecha, hora, autor, texto]

    for cruda in texto.translate(_INVISIBLES).splitlines():
        linea = cruda.strip()
        if not linea:
            continue

        inicio = _INICIO.match(linea)
        if inicio is None:
            # Continuacion de un mensaje de varias lineas.
            if mensajes:
                mensajes[-1][3] += "\n" + linea
            continue

        autor, separador, cuerpo = inicio["resto"].partition(": ")
        if not separador:
            # "Fulano se unió", "Cambiaste el asunto"...: aviso del sistema.
            continue
        mensajes.append(
            [inicio["fecha"], " ".join(inicio["hora"].split()), autor.strip(), cuerpo.strip()]
        )

    if not mensajes:
        raise ChatInvalido(
            "El archivo no parece un chat exportado de WhatsApp."
        )

    chat = ChatLeido(desde=f"{mensajes[0][0]} {mensajes[0][1]}",
                     hasta=f"{mensajes[-1][0]} {mensajes[-1][1]}")
    for fecha, hora, autor, cuerpo in mensajes:
        if not cuerpo or _es_ruido(cuerpo):
            continue
        if autor not in chat.participantes:
            chat.participantes.append(autor)
        chat.lineas.append(f"[{fecha} {hora}] {autor}: {cuerpo}")

    if not chat.lineas:
        raise ChatInvalido("El chat no tiene mensajes de texto que analizar.")
    return chat
