"""
Trabajos de descarga en segundo plano.

Bajar y convertir una cancion en el plan gratis de Render (0.1 CPU) puede
tardar mas de lo que aguanta una peticion abierta, y mientras tanto ocupa un
hilo de gunicorn. Por eso cada descarga es un trabajo:

1. `crear` responde al instante con un id y lanza un hilo.
2. El hilo espera su turno (`_CUPOS`), baja el audio con yt-dlp y lo convierte
   a MP3 con ffmpeg, anotando la fase y el avance en `estado.json`.
3. La pagina consulta ese estado cada segundo y, cuando dice `listo`, pide el
   archivo con un enlace normal: el navegador lo guarda sin pasar por memoria.

El estado va en disco y no en memoria porque gunicorn corre varios procesos y
la consulta puede caer en uno distinto al que lanzo el hilo. Todo vive en la
carpeta temporal y se borra solo a los `VIGENCIA` segundos.

La info que pidio la pagina antes de descargar se guarda en `info/<id>.json`
y el trabajo la reusa: se ahorra volver a leer el video, que es la mitad de la
espera.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from pathlib import Path

import httpx
import yt_dlp
from yt_dlp.extractor.youtube import YoutubeIE
from yt_dlp.utils import sanitize_filename

log = logging.getLogger(__name__)

BASE = Path(tempfile.gettempdir()) / "unu-descargas"
CACHE_INFO = BASE / "info"

CALIDADES = (320, 256, 192, 128)

# Una hora de audio en MP3 ya son 140 MB a 320 kbps y varios minutos de CPU.
DURACION_MAXIMA = 60 * 60

# Cuanto viven el MP3 listo y la info guardada antes de borrarse.
VIGENCIA = 20 * 60

# Si ffmpeg pasa de esto, algo se trabo: se corta.
TIEMPO_MAXIMO_CONVERSION = 15 * 60

# Conversiones a la vez por proceso. Con 0.1 CPU, dos ffmpeg en paralelo solo
# se estorban: mejor en fila y que cada una termine rapido.
_CUPOS = threading.BoundedSemaphore(int(os.environ.get("DESCARGAS_SIMULTANEAS", 1)))

# Por encima de esto se rechazan trabajos nuevos en vez de hacer una fila eterna.
MAXIMO_EN_CURSO = 6

FASES_ACTIVAS = {"en_cola", "bajando", "convirtiendo"}

_ID = re.compile(r"^[0-9a-f]{32}$")
_ID_VIDEO = re.compile(r"^[A-Za-z0-9_-]{11}$")

# Cookies de una cuenta de YouTube, en formato Netscape. En servidores en la
# nube YouTube a veces pide "confirma que no eres un bot"; con cookies pasa.
COOKIES = os.environ.get("YOUTUBE_COOKIES_FILE") or None


class ErrorDescarga(Exception):
    """Error con un mensaje que se le puede mostrar al usuario."""


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------


def opciones_yt_dlp(**extra) -> dict:
    opciones = {
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        # Un enlace de una cancion dentro de una lista trae `&list=`: se baja
        # solo esa cancion, no la lista entera.
        "noplaylist": True,
        "socket_timeout": 20,
        "retries": 3,
        **extra,
    }
    if COOKIES:
        opciones["cookiefile"] = COOKIES
    return opciones


def id_video(url: str) -> str | None:
    try:
        return YoutubeIE._match_id(url)
    except Exception:  # noqa: BLE001 - cualquier cosa rara es "no es un video"
        return None


def mensaje_de_error(exc: Exception) -> str:
    texto = str(exc)
    # El motivo real queda en los logs de Render; al usuario va uno corto.
    log.warning("yt-dlp: %s", texto[:1000])
    if "Private video" in texto:
        return "El video es privado."
    if "confirm your age" in texto:
        return "El video tiene restricción de edad y no se puede bajar."
    # En servidores en la nube YouTube pide iniciar sesión para "confirmar que
    # no eres un bot" o responde 403: bloquea la IP del servidor, no el video.
    if "Sign in" in texto or "not a bot" in texto or "HTTP Error 403" in texto:
        return (
            "YouTube bloqueó al servidor (pasa con las IPs de la nube). "
            "El video está bien: desde la versión local sí baja."
        )
    if "Video unavailable" in texto or "not available" in texto:
        return "El video no está disponible."
    return "YouTube no dejó leer ese video. Revisa la URL e intenta de nuevo."


def _escribir_json(ruta: Path, datos: dict) -> None:
    # Se escribe aparte y se reemplaza: quien lea nunca ve un JSON a medias.
    temporal = ruta.with_suffix(f".{uuid.uuid4().hex[:6]}.tmp")
    temporal.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    os.replace(temporal, ruta)


def limpiar_viejos() -> None:
    """Borra trabajos e info guardada que ya pasaron su vigencia."""
    if not BASE.exists():
        return
    limite = time.time() - VIGENCIA
    for ruta in [*BASE.iterdir(), *(CACHE_INFO.iterdir() if CACHE_INFO.exists() else [])]:
        if ruta == CACHE_INFO:
            continue
        try:
            if ruta.stat().st_mtime < limite:
                if ruta.is_dir():
                    shutil.rmtree(ruta, ignore_errors=True)
                else:
                    ruta.unlink(missing_ok=True)
        except OSError:
            pass


# ---------------------------------------------------------------------------
# Info del video
# ---------------------------------------------------------------------------


def leer_info(url: str) -> dict:
    """Lee el video sin bajarlo y deja la info guardada para el trabajo."""
    video = id_video(url)
    guardada = _info_guardada(video)
    if guardada is not None:
        return guardada

    try:
        with yt_dlp.YoutubeDL(opciones_yt_dlp(skip_download=True)) as ydl:
            datos = ydl.extract_info(url, download=False)
            datos = ydl.sanitize_info(datos)
    except yt_dlp.utils.DownloadError as exc:
        raise ErrorDescarga(mensaje_de_error(exc)) from exc

    if datos.get("_type") == "playlist":
        raise ErrorDescarga("Esa URL es una lista. Pega el enlace de una canción.")

    if datos.get("id") and _ID_VIDEO.match(datos["id"]):
        CACHE_INFO.mkdir(parents=True, exist_ok=True)
        _escribir_json(CACHE_INFO / f"{datos['id']}.json", datos)
    return datos


def _info_guardada(video: str | None) -> dict | None:
    if not video or not _ID_VIDEO.match(video):
        return None
    ruta = CACHE_INFO / f"{video}.json"
    try:
        if time.time() - ruta.stat().st_mtime > VIGENCIA:
            return None
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def resumen_info(datos: dict) -> dict:
    """Lo que la pagina necesita de la info completa de yt-dlp."""
    bitrates = [
        f["abr"]
        for f in datos.get("formats") or []
        if f.get("vcodec") == "none" and f.get("acodec") != "none" and f.get("abr")
    ]
    return {
        "id": datos.get("id"),
        "titulo": datos.get("track") or datos.get("title"),
        "artista": _artista(datos),
        "duracion": datos.get("duration"),
        "miniatura": datos.get("thumbnail"),
        "audio_kbps": round(max(bitrates)) if bitrates else None,
        "en_vivo": bool(datos.get("is_live")),
        "duracion_maxima": DURACION_MAXIMA,
    }


def _artista(datos: dict) -> str | None:
    artistas = datos.get("artists") or []
    nombre = (
        (artistas[0] if artistas else None)
        or datos.get("artist")
        or datos.get("uploader")
        or datos.get("channel")
    )
    # Los canales automaticos de YouTube Music se llaman "Artista - Topic".
    return nombre.removesuffix(" - Topic") if nombre else None


# ---------------------------------------------------------------------------
# Trabajos
# ---------------------------------------------------------------------------


def _carpeta(id_trabajo: str) -> Path:
    return BASE / id_trabajo


def estado(id_trabajo: str) -> dict | None:
    if not _ID.match(id_trabajo):
        return None
    try:
        return json.loads(
            (_carpeta(id_trabajo) / "estado.json").read_text(encoding="utf-8")
        )
    except (OSError, ValueError):
        return None


def archivo(id_trabajo: str) -> tuple[Path, str] | None:
    """Ruta y nombre del MP3 listo, o None si no esta."""
    datos = estado(id_trabajo)
    if not datos or datos.get("fase") != "listo":
        return None
    ruta = _carpeta(id_trabajo) / "salida.mp3"
    return (ruta, datos["nombre"]) if ruta.exists() else None


def en_curso() -> int:
    if not BASE.exists():
        return 0
    total = 0
    for carpeta in BASE.iterdir():
        datos = estado(carpeta.name) if carpeta.is_dir() else None
        if datos and datos.get("fase") in FASES_ACTIVAS:
            total += 1
    return total


def crear(url: str, kbps: int) -> str:
    limpiar_viejos()
    if en_curso() >= MAXIMO_EN_CURSO:
        raise ErrorDescarga(
            "Hay muchas descargas en curso. Intenta en un par de minutos."
        )

    id_trabajo = uuid.uuid4().hex
    carpeta = _carpeta(id_trabajo)
    carpeta.mkdir(parents=True)
    trabajo = _Trabajo(carpeta, url, kbps)
    trabajo.guardar(fase="en_cola", progreso=0)

    hilo = threading.Thread(
        target=trabajo.ejecutar,
        name=f"descarga-{id_trabajo[:8]}",
        daemon=True,
    )
    hilo.start()
    return id_trabajo


class _Trabajo:
    def __init__(self, carpeta: Path, url: str, kbps: int):
        self.carpeta = carpeta
        self.url = url
        self.kbps = kbps
        self._ultimo_guardado = 0.0
        self._datos: dict = {}

    def guardar(self, *, forzar: bool = True, **cambios) -> None:
        # El avance llega muchas veces por segundo; al disco va cada medio.
        ahora = time.monotonic()
        if not forzar and ahora - self._ultimo_guardado < 0.5:
            return
        self._ultimo_guardado = ahora
        self._datos.update(cambios)
        try:
            _escribir_json(self.carpeta / "estado.json", self._datos)
        except OSError:
            log.warning("No se pudo guardar el estado de %s", self.carpeta.name)

    def ejecutar(self) -> None:
        try:
            with _CUPOS:
                self.guardar(fase="bajando", progreso=0)
                info, fuente = self._bajar()
                self.guardar(fase="convirtiendo", progreso=0)
                nombre = self._convertir(info, fuente)
            self.guardar(fase="listo", progreso=1, nombre=nombre)
        except ErrorDescarga as exc:
            self.guardar(fase="error", mensaje=str(exc))
        except Exception:  # noqa: BLE001 - el hilo no puede reventar callado
            log.exception("Fallo el trabajo de descarga %s", self.carpeta.name)
            self.guardar(fase="error", mensaje="Algo falló al preparar el MP3.")
        finally:
            for sobrante in self.carpeta.glob("fuente.*"):
                sobrante.unlink(missing_ok=True)
            (self.carpeta / "portada").unlink(missing_ok=True)

    # -- Paso 1: bajar el audio original ---------------------------------

    def _bajar(self) -> tuple[dict, Path]:
        def avance(d: dict) -> None:
            if d.get("status") != "downloading":
                return
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            if total:
                self.guardar(
                    forzar=False, progreso=min(d.get("downloaded_bytes", 0) / total, 1)
                )

        opciones = opciones_yt_dlp(
            # Solo el audio: ni un byte de video.
            format="bestaudio/best",
            outtmpl=str(self.carpeta / "fuente.%(ext)s"),
            progress_hooks=[avance],
        )

        video = id_video(self.url)
        info = _info_guardada(video)
        try:
            with yt_dlp.YoutubeDL(opciones) as ydl:
                if info is None:
                    info = ydl.sanitize_info(ydl.extract_info(self.url, download=False))
                self._revisar(info)
                # Con la info ya leida, yt-dlp baja directo. Si los enlaces
                # vencieron, vuelve a leer el video por su cuenta.
                ruta_info = self.carpeta / "info.json"
                _escribir_json(ruta_info, info)
                ydl.download_with_info_file(str(ruta_info))
                ruta_info.unlink(missing_ok=True)
        except yt_dlp.utils.DownloadError as exc:
            raise ErrorDescarga(mensaje_de_error(exc)) from exc

        fuentes = [p for p in self.carpeta.glob("fuente.*") if not p.name.endswith(".part")]
        if not fuentes:
            raise ErrorDescarga("No se pudo bajar el audio. Intenta de nuevo.")
        return info, fuentes[0]

    def _revisar(self, info: dict) -> None:
        if info.get("_type") == "playlist":
            raise ErrorDescarga("Esa URL es una lista. Pega el enlace de una canción.")
        if info.get("is_live"):
            raise ErrorDescarga("Las transmisiones en vivo no se pueden descargar.")
        if (info.get("duration") or 0) > DURACION_MAXIMA:
            raise ErrorDescarga("El video dura más de una hora.")

    # -- Paso 2: convertir a MP3 con carátula y datos ---------------------

    def _convertir(self, info: dict, fuente: Path) -> str:
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            raise ErrorDescarga("El servidor no tiene ffmpeg instalado.")

        titulo = info.get("track") or info.get("title") or "audio"
        artista = _artista(info) or ""
        destino = self.carpeta / "salida.mp3"
        portada = self._bajar_portada(info)

        comando = [ffmpeg, "-hide_banner", "-nostdin", "-y", "-i", str(fuente)]
        if portada:
            comando += ["-i", str(portada)]
        comando += ["-map", "0:a"]
        if portada:
            # Carátula cuadrada, recortada del centro de la miniatura.
            comando += [
                "-map", "1:v",
                "-filter:v", "crop='min(iw,ih)':'min(iw,ih)',scale=500:500",
                "-c:v", "mjpeg", "-q:v", "3",
                "-disposition:v", "attached_pic",
                "-metadata:s:v", "title=Album cover",
                "-metadata:s:v", "comment=Cover (front)",
            ]  # fmt: skip
        comando += [
            "-c:a", "libmp3lame", "-b:a", f"{self.kbps}k",
            "-threads", "1",
            "-id3v2_version", "3",
            "-metadata", f"title={titulo}",
            "-metadata", f"artist={artista}",
            "-metadata", f"comment={info.get('webpage_url') or self.url}",
            "-progress", "pipe:1", "-nostats", "-loglevel", "error",
            str(destino),
        ]  # fmt: skip

        duracion_us = (info.get("duration") or 0) * 1_000_000
        inicio = time.monotonic()
        proceso = subprocess.Popen(
            comando,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        # ffmpeg escribe su avance en stdout como `out_time_us=123456`.
        assert proceso.stdout is not None
        for linea in proceso.stdout:
            if time.monotonic() - inicio > TIEMPO_MAXIMO_CONVERSION:
                proceso.kill()
                raise ErrorDescarga("La conversión tardó demasiado.")
            clave, _, valor = linea.strip().partition("=")
            if clave == "out_time_us" and duracion_us and valor.isdigit():
                self.guardar(forzar=False, progreso=min(int(valor) / duracion_us, 1))

        _, errores = proceso.communicate()
        if proceso.returncode != 0 or not destino.exists():
            log.error("ffmpeg fallo (%s): %s", proceso.returncode, errores[-2000:])
            raise ErrorDescarga("No se pudo convertir el audio a MP3.")

        return f"{sanitize_filename(titulo)}.mp3"

    def _bajar_portada(self, info: dict) -> Path | None:
        """La miniatura grande del video; sin ella el MP3 sale igual."""
        video = info.get("id")
        candidatas = []
        if video and _ID_VIDEO.match(video):
            candidatas.append(f"https://i.ytimg.com/vi/{video}/maxresdefault.jpg")
        if info.get("thumbnail"):
            candidatas.append(info["thumbnail"])

        for enlace in candidatas:
            try:
                respuesta = httpx.get(enlace, timeout=10, follow_redirects=True)
            except httpx.HTTPError:
                continue
            if respuesta.status_code == 200 and 0 < len(respuesta.content) < 5_000_000:
                ruta = self.carpeta / "portada"
                ruta.write_bytes(respuesta.content)
                return ruta
        return None
