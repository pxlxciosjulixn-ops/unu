"""
Cuentas de un mes: las usan los correos y el asistente de IA.

El dashboard hace sus propias cuentas en el navegador; estas son las mismas
reglas (el valor siempre es positivo y lo que suma o resta lo dice el tipo, y
los conceptos se agrupan sin distinguir mayusculas).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta

from django.db.models import Count, Sum
from django.db.models.functions import Lower, Trim

from finanzas.conceptos import CONCEPTOS_FIJOS, homogenizar
from finanzas.models import Movimiento

MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def nombre_mes(mes: date) -> str:
    return f"{MESES[mes.month - 1]} de {mes.year}"


def primer_dia(fecha: date) -> date:
    return fecha.replace(day=1)


def mes_anterior(mes: date) -> date:
    return (primer_dia(mes) - timedelta(days=1)).replace(day=1)


def mes_siguiente(mes: date) -> date:
    return date(mes.year + (mes.month == 12), mes.month % 12 + 1, 1)


def formato_pesos(valor: int) -> str:
    """1234567 → "$ 1.234.567", como en el dashboard."""
    signo = "-" if valor < 0 else ""
    return f"{signo}$ {abs(valor):,}".replace(",", ".")


@dataclass
class Concepto:
    nombre: str
    total: int
    veces: int


@dataclass
class ResumenMes:
    mes: date
    ingresos: int = 0
    gastos: int = 0
    movimientos: int = 0
    conceptos_gasto: list[Concepto] = field(default_factory=list)

    @property
    def balance(self) -> int:
        return self.ingresos - self.gastos

    @property
    def ahorro_pct(self) -> float | None:
        """Parte de lo que entró que no se gastó; None si no entró nada."""
        return self.balance / self.ingresos * 100 if self.ingresos else None

    @property
    def sobregasto(self) -> bool:
        return self.gastos > self.ingresos

    @property
    def nombre(self) -> str:
        return nombre_mes(self.mes)


def _del_mes(mes: date):
    inicio = primer_dia(mes)
    return Movimiento.objects.filter(fecha__gte=inicio, fecha__lt=mes_siguiente(inicio))


def _nombre(texto: str) -> str:
    """El nombre de la lista si es un concepto fijo; si no, con mayúscula inicial."""
    fijo = homogenizar(texto)
    return fijo if fijo in CONCEPTOS_FIJOS else texto.capitalize()


def resumen_mes(mes: date, top: int = 5) -> ResumenMes:
    consulta = _del_mes(mes)
    resumen = ResumenMes(mes=primer_dia(mes))

    for fila in consulta.values("tipo").annotate(total=Sum("valor"), n=Count("id")):
        resumen.movimientos += fila["n"]
        if fila["tipo"] == Movimiento.Tipo.INGRESO:
            resumen.ingresos = fila["total"] or 0
        else:
            resumen.gastos = fila["total"] or 0

    grupos = (
        consulta.filter(tipo=Movimiento.Tipo.GASTO)
        .annotate(clave=Lower(Trim("concepto")))
        .values("clave")
        .annotate(total=Sum("valor"), veces=Count("id"))
        .order_by("-total")[:top]
    )
    resumen.conceptos_gasto = [
        Concepto(nombre=_nombre(g["clave"]), total=g["total"], veces=g["veces"])
        for g in grupos
    ]
    return resumen

