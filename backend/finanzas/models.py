"""
Gastos e ingresos personales.

Cada fila es un movimiento suelto: la fecha la escribe quien registra (no es la
de creacion, se puede anotar un gasto de la semana pasada) y el valor va
siempre en positivo; si suma o resta lo dice `tipo`.
"""

from __future__ import annotations

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from finanzas.conceptos import clave as clave_de_concepto

CONCEPTO_MAX = 100

# Cabe de sobra en un BigInteger y sigue siendo exacto en un `number` de
# JavaScript (hasta 9 007 199 254 740 991), que es donde se suman en el
# dashboard.
VALOR_MAX = 999_999_999_999_999


class Movimiento(models.Model):
    class Tipo(models.TextChoices):
        GASTO = "gasto", "Gasto"
        INGRESO = "ingreso", "Ingreso"

    fecha = models.DateField("fecha de registro")
    tipo = models.CharField("tipo", max_length=10, choices=Tipo.choices)
    concepto = models.CharField("concepto", max_length=CONCEPTO_MAX)
    valor = models.BigIntegerField(
        "valor",
        validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)],
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["-fecha", "-id"]
        verbose_name = "movimiento"
        verbose_name_plural = "movimientos"
        indexes = [models.Index(fields=["fecha"])]

    def __str__(self) -> str:
        return f"{self.fecha} · {self.get_tipo_display()} · {self.concepto}"


class Sugerencia(models.Model):
    """
    Conceptos que se sugieren al escribir.

    `clave` es el nombre sin tildes, en minusculas y con espacios simples: es
    lo unico que impide dos sugerencias que solo se distinguen por como se
    escriben ("Mt15" y "mt15 "), y es tambien con lo que `conceptos.homogenizar`
    decide que un movimiento anotado como "mt15" se guarde como "Mt15", para
    que todo lo de un concepto sume junto en el dashboard.

    La lista arranca con los conceptos de `conceptos.CONCEPTOS_SEMILLA` (los
    sembro la migracion 0004), pero desde ahi manda la tabla: lo que se agregue
    o se borre en la pagina de edicion es lo que se sugiere y lo que homogeniza.
    """

    nombre = models.CharField("nombre", max_length=CONCEPTO_MAX)
    clave = models.CharField(
        "clave", max_length=CONCEPTO_MAX, unique=True, editable=False
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "sugerencia"
        verbose_name_plural = "sugerencias"

    def save(self, *args, **kwargs):
        self.nombre = " ".join(self.nombre.split())
        self.clave = clave_de_concepto(self.nombre)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.nombre


class AvisoEnviado(models.Model):
    """
    Correos de finanzas ya mandados, para no repetirlos.

    Hay uno por tipo y por mes. La fila se crea antes de mandar el correo (la
    llave unica frena a dos procesos que intenten el mismo aviso a la vez) y se
    borra si el envio falla, para que se intente de nuevo mas tarde.
    """

    class Tipo(models.TextChoices):
        SOBREGASTO = "sobregasto", "Gastos por encima de los ingresos"
        RESUMEN = "resumen", "Resumen del mes"

    tipo = models.CharField("tipo", max_length=16, choices=Tipo.choices)
    # Primer dia del mes al que se refiere el aviso.
    mes = models.DateField("mes")
    enviado_at = models.DateTimeField("enviado", auto_now_add=True)

    class Meta:
        verbose_name = "aviso enviado"
        verbose_name_plural = "avisos enviados"
        ordering = ["-enviado_at"]
        constraints = [
            models.UniqueConstraint(fields=["tipo", "mes"], name="aviso_unico_por_mes")
        ]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} · {self.mes:%Y-%m}"
