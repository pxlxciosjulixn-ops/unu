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

    class Grupo(models.TextChoices):
        DEUDA = "deuda", "Deudas"
        FAMILIA = "familia", "Familia"
        COMIDA = "comida", "Comida"
        TRANSPORTE = "transporte", "Transporte"
        MASCOTAS = "mascotas", "Mascotas"
        HOGAR = "hogar", "Hogar y servicios"
        GUSTOS = "gustos", "Gustos y salidas"
        OTRO = "otro", "Otros"

    nombre = models.CharField("nombre", max_length=CONCEPTO_MAX)
    clave = models.CharField(
        "clave", max_length=CONCEPTO_MAX, unique=True, editable=False
    )
    # Para juntar conceptos en el dashboard (cuánto se va en deudas, en la
    # familia...). Lo que no tenga sugerencia cuenta como "otro".
    grupo = models.CharField(
        "grupo", max_length=16, choices=Grupo.choices, default=Grupo.OTRO
    )
    # Tope de gasto al mes; vacío es sin presupuesto.
    presupuesto = models.BigIntegerField(
        "presupuesto mensual",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)],
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


class AjusteVisual(models.Model):
    """
    Como se ve el dashboard para quien entra desde una IP: estilo, tema, color
    de acento y letra.

    Va en la base y no solo en el navegador para que al abrir las paginas en
    otro equipo de la misma red salga el mismo diseño. La IP no se guarda: la
    llave es su hash con sal (`chat.services.hash_visitante`).
    """

    visitante = models.CharField("visitante", max_length=64, unique=True)
    datos = models.JSONField("datos", default=dict)
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "ajuste visual"
        verbose_name_plural = "ajustes visuales"

    def __str__(self) -> str:
        return f"{self.visitante[:10]}… · {self.updated_at:%Y-%m-%d}"


class Credito(models.Model):
    """
    Un crédito (Nu, Addi, Mt15, Solventa, LuckyPlata…) y cuánto se debe.

    El saldo no se guarda: sale de los movimientos con el mismo concepto desde
    `fecha_inicio`. Un gasto con ese concepto es un abono y baja la deuda; un
    ingreso es un avance (plata que se sacó del crédito) y la sube. Así no hay
    que anotar nada dos veces: basta registrar el movimiento como siempre.
    """

    nombre = models.CharField("nombre", max_length=CONCEPTO_MAX)
    clave = models.CharField(
        "clave", max_length=CONCEPTO_MAX, unique=True, editable=False
    )
    saldo_inicial = models.BigIntegerField(
        "saldo al empezar",
        validators=[MinValueValidator(0), MaxValueValidator(VALOR_MAX)],
    )
    # Los movimientos de este día en adelante mueven el saldo; los de antes
    # ya están dentro de `saldo_inicial`.
    fecha_inicio = models.DateField("desde")
    # Hasta cuánto presta (tarjeta, cupo de avances); vacío si no aplica.
    cupo = models.BigIntegerField(
        "cupo",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)],
    )
    # Tasa efectiva anual en %, para saber cuál sale más caro y cuánto se
    # paga de intereses. Vacía si no se sabe.
    tasa_ea = models.DecimalField(
        "tasa efectiva anual (%)",
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
    )
    # Qué parte de cada pago se va en intereses, seguros y demás costos (sale
    # del extracto: pago total contra abono a capital). Con ella cada abono
    # baja la deuda solo por su parte de capital. Vacía: todo va a capital.
    costo_pct = models.DecimalField(
        "% de cada pago en intereses y seguros",
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    # Lo que se paga al mes, para calcular cuánto falta.
    cuota = models.BigIntegerField(
        "cuota mensual",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)],
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "crédito"
        verbose_name_plural = "créditos"

    def save(self, *args, **kwargs):
        self.nombre = " ".join(self.nombre.split())
        self.clave = clave_de_concepto(self.nombre)
        return super().save(*args, **kwargs)

    def movimientos(self):
        """Los movimientos que mueven el saldo, del más viejo al más nuevo."""
        return [
            m
            for m in Movimiento.objects.filter(fecha__gte=self.fecha_inicio).order_by(
                "fecha", "id"
            )
            if clave_de_concepto(m.concepto) == self.clave
        ]

    def __str__(self) -> str:
        return self.nombre


class CargoCredito(models.Model):
    """
    Lo que la entidad le suma a la deuda sin que entre plata: intereses,
    cuota de manejo, seguro, mora.

    No es un movimiento: no es un gasto (no salió de la billetera) ni un
    ingreso (no entró nada). Solo sube el saldo del crédito.
    """

    class Tipo(models.TextChoices):
        INTERESES = "intereses", "Intereses"
        MANEJO = "manejo", "Cuota de manejo"
        SEGURO = "seguro", "Seguro"
        MORA = "mora", "Intereses de mora"
        OTRO = "otro", "Otro cargo"

    credito = models.ForeignKey(
        Credito, on_delete=models.CASCADE, related_name="cargos", verbose_name="crédito"
    )
    fecha = models.DateField("fecha")
    tipo = models.CharField("tipo", max_length=16, choices=Tipo.choices, default=Tipo.INTERESES)
    valor = models.BigIntegerField(
        "valor", validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)]
    )
    nota = models.CharField("nota", max_length=200, blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["fecha", "id"]
        verbose_name = "cargo de crédito"
        verbose_name_plural = "cargos de créditos"

    def __str__(self) -> str:
        return f"{self.credito} · {self.get_tipo_display()} · {self.valor}"


class GastoFijo(models.Model):
    """
    Un pago de todos los meses (lo de Mamá, el arriendo…).

    Se lleva por concepto, igual que los créditos: un gasto con ese concepto
    es un pago y un ingreso es un préstamo de esa persona, que se suma a lo
    que se le debe ese mes. Las cuentas están en `finanzas/fijos.py`.
    """

    nombre = models.CharField("nombre", max_length=CONCEPTO_MAX)
    clave = models.CharField(
        "clave", max_length=CONCEPTO_MAX, unique=True, editable=False
    )
    monto = models.BigIntegerField(
        "monto mensual", validators=[MinValueValidator(1), MaxValueValidator(VALOR_MAX)]
    )
    # Hasta qué día del mes hay plazo; vacío si no hay día fijo.
    dia_pago = models.PositiveSmallIntegerField(
        "día de pago",
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    # El primer mes que cuenta: los pagos de antes no entran.
    fecha_inicio = models.DateField("desde")
    # El último mes en que se debe; vacío es para siempre. Igual a
    # `fecha_inicio` para algo de una sola vez (el préstamo de un amigo).
    fecha_fin = models.DateField("hasta", null=True, blank=True)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "gasto fijo"
        verbose_name_plural = "gastos fijos"

    def save(self, *args, **kwargs):
        self.nombre = " ".join(self.nombre.split())
        self.clave = clave_de_concepto(self.nombre)
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.nombre} · {self.monto}"


class ConfiguracionFinanzas(models.Model):
    """
    Datos sueltos de la persona, una sola fila: por ahora el salario, que es
    con lo que se simula cuánto queda el mes siguiente.
    """

    salario = models.BigIntegerField(
        "salario mensual",
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(VALOR_MAX)],
    )
    updated_at = models.DateTimeField("actualizado", auto_now=True)

    class Meta:
        verbose_name = "configuración de finanzas"
        verbose_name_plural = "configuración de finanzas"

    @classmethod
    def actual(cls) -> "ConfiguracionFinanzas":
        fila, _ = cls.objects.get_or_create(pk=1)
        return fila

    def __str__(self) -> str:
        return f"Salario {self.salario}"
