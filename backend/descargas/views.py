"""
Descarga de canciones de YouTube en MP3.

- `info`: lee el video sin bajarlo (titulo, artista, duracion, miniatura) para
  que el usuario elija la calidad antes de esperar.
- `crear_trabajo`: lanza la descarga en segundo plano y responde al instante.
- `estado_trabajo`: fase y avance, que la pagina consulta cada segundo.
- `archivo_trabajo`: el MP3 listo, como adjunto.

La logica pesada vive en `trabajos.py`. Solo se aceptan direcciones de
YouTube: yt-dlp entiende cientos de sitios y no hay por que dejar que el
servidor vaya a pedir cualquier URL.

Ojo con la calidad: YouTube entrega el audio en Opus o AAC a unos 130-160
kbps. Un MP3 a 320 sale de ahi, asi que no suena mejor que el original.
`info` devuelve el bitrate de la fuente para que la pagina lo diga.
"""

from __future__ import annotations

from urllib.parse import urlparse

from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from descargas import trabajos

DOMINIOS = {
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
}


class DescargasThrottle(ScopedRateThrottle):
    scope = "descargas"


def _url_valida(url: object) -> str | None:
    if not isinstance(url, str):
        return None
    url = url.strip()
    partes = urlparse(url)
    if partes.scheme not in {"http", "https"}:
        return None
    if (partes.hostname or "").lower() not in DOMINIOS:
        return None
    return url if trabajos.id_video(url) else None


def _error(mensaje: str, codigo: int = status.HTTP_400_BAD_REQUEST) -> Response:
    return Response({"detail": mensaje}, status=codigo)


URL_INVALIDA = "Pega el enlace de un video de YouTube (youtube.com o youtu.be)."


@api_view(["POST"])
@throttle_classes([DescargasThrottle])
def info(request: Request) -> Response:
    """Datos del video para armar la pagina."""
    url = _url_valida(request.data.get("url"))
    if url is None:
        return _error(URL_INVALIDA)

    try:
        datos = trabajos.leer_info(url)
    except trabajos.ErrorDescarga as exc:
        return _error(str(exc))
    return Response(trabajos.resumen_info(datos))


@api_view(["POST"])
@throttle_classes([DescargasThrottle])
def crear_trabajo(request: Request) -> Response:
    """Cuerpo: `url` y `calidad` (kbps: 320, 256, 192 o 128)."""
    url = _url_valida(request.data.get("url"))
    if url is None:
        return _error(URL_INVALIDA)

    try:
        kbps = int(request.data.get("calidad", 320))
    except (TypeError, ValueError):
        kbps = 0
    if kbps not in trabajos.CALIDADES:
        return _error("La calidad va entre 128 y 320 kbps.")

    try:
        id_trabajo = trabajos.crear(url, kbps)
    except trabajos.ErrorDescarga as exc:
        return _error(str(exc), status.HTTP_503_SERVICE_UNAVAILABLE)
    return Response({"id": id_trabajo}, status=status.HTTP_202_ACCEPTED)


@api_view(["GET"])
def estado_trabajo(request: Request, id_trabajo: str) -> Response:
    """Sin cupo por IP: la pagina pregunta cada segundo mientras espera."""
    datos = trabajos.estado(id_trabajo)
    if datos is None:
        return _error("La descarga no existe o ya venció.", status.HTTP_404_NOT_FOUND)
    return Response(datos)


def archivo_trabajo(request, id_trabajo: str) -> FileResponse:
    """
    El MP3 como adjunto. Vista de Django y no de DRF: la pagina la abre con un
    enlace normal y el navegador guarda el archivo sin cargarlo en memoria.
    """
    listo = trabajos.archivo(id_trabajo)
    if listo is None:
        raise Http404("La descarga no existe o ya venció.")
    ruta, nombre = listo
    return FileResponse(
        ruta.open("rb"),
        as_attachment=True,
        filename=nombre,
        content_type="audio/mpeg",
    )
