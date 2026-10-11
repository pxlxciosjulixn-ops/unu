"""
Página de ubicación: un trabajo de la universidad.

Solo guarda la información de quien ENTRA y le da "Aceptar". Si no acepta, no
se crea ningún registro: el consentimiento es el clic en el botón (Ley 1581
de 2012, habeas data).
"""

from __future__ import annotations

from django.db import models


class RegistroUbicacion(models.Model):
    """Una visita que aceptó: su IP, la ciudad por IP y, si la dio, el GPS."""

    # La IP se guarda tal cual (es el dato que pide el trabajo). Como texto
    # para que un valor raro no reviente el guardado.
    ip = models.CharField("IP", max_length=45)
    # Ubicación aproximada que se deduce de la IP.
    ciudad = models.CharField("ciudad", max_length=120, blank=True)
    region = models.CharField("departamento/región", max_length=120, blank=True)
    pais = models.CharField("país", max_length=120, blank=True)
    lat_ip = models.FloatField("lat por IP", null=True, blank=True)
    lon_ip = models.FloatField("lon por IP", null=True, blank=True)
    # Ubicación exacta por GPS, solo si el navegador la entregó.
    lat_gps = models.FloatField("lat por GPS", null=True, blank=True)
    lon_gps = models.FloatField("lon por GPS", null=True, blank=True)
    precision_gps = models.FloatField("precisión GPS (m)", null=True, blank=True)
    user_agent = models.CharField("navegador", max_length=400, blank=True)
    created_at = models.DateTimeField("registrado", auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "registro de ubicación"
        verbose_name_plural = "registros de ubicación"

    @property
    def tiene_gps(self) -> bool:
        return self.lat_gps is not None and self.lon_gps is not None

    def __str__(self) -> str:
        donde = self.ciudad or self.ip
        return f"{donde} · {self.created_at:%Y-%m-%d %H:%M}"


class ConfigUbicacion(models.Model):
    """
    Los textos de la página, una sola fila, para poder cambiarlos sin tocar
    el código (desde el admin de Django).
    """

    AVISO_TITULO = "Tu ubicación está siendo registrada"
    AVISO_MENSAJE = (
        "Al abrir esta página se toma tu dirección IP y, si aceptas, tu "
        "ubicación exacta por GPS. No se guarda nada hasta que presiones "
        "Aceptar. Puedes cerrar la página si no estás de acuerdo."
    )
    TEXTO_FINAL = (
        "Esta es una página de pruebas para tomar la ubicación, desarrollada "
        "por Julian Palacios para un trabajo de la universidad. ¡Gracias por "
        "participar!"
    )

    aviso_titulo = models.CharField("título del aviso", max_length=200, default=AVISO_TITULO)
    aviso_mensaje = models.TextField("mensaje del aviso", default=AVISO_MENSAJE)
    texto_final = models.TextField("texto después de aceptar", default=TEXTO_FINAL)

    class Meta:
        verbose_name = "configuración de la página"
        verbose_name_plural = "configuración de la página"

    @classmethod
    def actual(cls) -> "ConfigUbicacion":
        fila, _ = cls.objects.get_or_create(pk=1)
        return fila

    def __str__(self) -> str:
        return "Textos de la página de ubicación"
