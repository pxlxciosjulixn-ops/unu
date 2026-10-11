"""Ubicación aproximada a partir de la IP."""

from __future__ import annotations

import ipaddress
import logging

import httpx

logger = logging.getLogger(__name__)


def es_local(ip: str) -> bool:
    """IP privada, loopback o inválida (típico en pruebas locales)."""
    try:
        direccion = ipaddress.ip_address(ip)
    except ValueError:
        return True
    return direccion.is_private or direccion.is_loopback


def geolocalizar(ip: str) -> dict:
    """
    Ciudad, región, país y coordenadas aproximadas de una IP pública. `{}` si
    es local o si el servicio no responde: el frontend igual guarda la IP.

    Usa ip-api.com, gratis y sin llave para uso no comercial. La IP viaja a
    ese servicio solo para traducirla a una ciudad.
    """
    if es_local(ip):
        return {}
    try:
        respuesta = httpx.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,country,regionName,city,lat,lon", "lang": "es"},
            timeout=5.0,
        )
        datos = respuesta.json()
    except Exception:  # noqa: BLE001 - si falla, se guarda solo la IP
        logger.exception("No se pudo geolocalizar la IP")
        return {}
    if datos.get("status") != "success":
        return {}
    return {
        "ciudad": datos.get("city") or "",
        "region": datos.get("regionName") or "",
        "pais": datos.get("country") or "",
        "lat_ip": datos.get("lat"),
        "lon_ip": datos.get("lon"),
    }
