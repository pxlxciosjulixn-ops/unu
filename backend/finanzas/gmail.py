"""
Envio de correo por la API de Gmail.

Con el refresh token se pide un token de acceso de una hora y con ese se manda
el mensaje. Nada de SMTP ni contrasenas: si alguien roba el .env, basta con
revocar el acceso de la app en la cuenta de Google.
"""

from __future__ import annotations

import base64
import logging
from email.message import EmailMessage

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

URL_TOKEN = "https://oauth2.googleapis.com/token"
URL_ENVIO = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


class GmailError(Exception):
    pass


def configurado() -> bool:
    return all(
        [
            settings.GMAIL_FROM,
            settings.GMAIL_CLIENT_ID,
            settings.GMAIL_CLIENT_SECRET,
            settings.GMAIL_REFRESH_TOKEN,
        ]
    )


def token_de_acceso(cliente: httpx.Client) -> str:
    respuesta = cliente.post(
        URL_TOKEN,
        data={
            "client_id": settings.GMAIL_CLIENT_ID,
            "client_secret": settings.GMAIL_CLIENT_SECRET,
            "refresh_token": settings.GMAIL_REFRESH_TOKEN,
            "grant_type": "refresh_token",
        },
    )
    if respuesta.status_code != 200:
        # El cuerpo trae el motivo (token vencido, revocado…) y nada secreto.
        raise GmailError(f"Google no entregó el token ({respuesta.status_code}): {respuesta.text[:300]}")
    return respuesta.json()["access_token"]


def enviar(destino: str, asunto: str, texto: str, html: str | None = None) -> None:
    """Manda un correo. Lanza `GmailError` si Google lo rechaza."""
    if not configurado():
        raise GmailError("Faltan credenciales de Gmail en el .env.")

    mensaje = EmailMessage()
    mensaje["From"] = f"Mis finanzas <{settings.GMAIL_FROM}>"
    mensaje["To"] = destino
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")

    crudo = base64.urlsafe_b64encode(mensaje.as_bytes()).decode()

    with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as cliente:
        token = token_de_acceso(cliente)
        respuesta = cliente.post(
            URL_ENVIO,
            headers={"Authorization": f"Bearer {token}"},
            json={"raw": crudo},
        )
    if respuesta.status_code >= 300:
        raise GmailError(f"Gmail rechazó el envío ({respuesta.status_code}): {respuesta.text[:300]}")
    logger.info("Correo enviado a %s: %s", destino, asunto)
