"""
Las finanzas en texto, para el asistente de IA.

Se arma en cada pregunta con lo que hay en la base, así que el asistente
responde con el último gasto registrado. Va resumido (unos pocos miles de
caracteres) porque se manda completo en cada turno.
"""

from __future__ import annotations

from django.db.models import Count, Min, Sum
from django.utils import timezone

from finanzas.calculos import (
    ResumenMes,
    formato_pesos,
    mes_anterior,
    primer_dia,
    resumen_mes,
)
from finanzas.models import Movimiento


def _pct(valor: float | None) -> str:
    return "sin ingresos" if valor is None else f"{valor:.1f} %"


def _bloque(titulo: str, r: ResumenMes, tope: int) -> list[str]:
    lineas = [
        f"{titulo} ({r.nombre}):",
        f"- Ingresos {formato_pesos(r.ingresos)}, gastos {formato_pesos(r.gastos)}, "
        f"balance {formato_pesos(r.balance)}, ahorro {_pct(r.ahorro_pct)}, "
        f"{r.movimientos} movimientos.",
    ]
    if r.conceptos_gasto:
        # Numerados y con su parte del total: el modelo no tiene que ordenar ni
        # dividir, que es donde más se equivoca.
        lineas.append("- Gastos por concepto, de mayor a menor:")
        lineas += [
            f"  {i}. {c.nombre}: {formato_pesos(c.total)} "
            f"({c.total / r.gastos * 100:.1f} % del gasto, {c.veces} mov.)"
            for i, c in enumerate(r.conceptos_gasto[:tope], start=1)
        ]
    return lineas


def _cambios(actual: ResumenMes, pasado: ResumenMes) -> list[str]:
    """Diferencia por concepto de gasto contra el mes pasado, ya calculada."""
    antes = {c.nombre: c.total for c in pasado.conceptos_gasto}
    ahora = {c.nombre: c.total for c in actual.conceptos_gasto}
    filas = []
    for nombre in set(antes) | set(ahora):
        hoy, previo = ahora.get(nombre, 0), antes.get(nombre, 0)
        if hoy == previo:
            continue
        signo = "+" if hoy > previo else "-"
        filas.append(
            (
                abs(hoy - previo),
                f"  - {nombre}: {signo}{formato_pesos(abs(hoy - previo))} "
                f"({formato_pesos(hoy)} vs. {formato_pesos(previo)})",
            )
        )
    if not filas:
        return []
    filas.sort(reverse=True)
    titulo = "Cambio de gasto por concepto, este mes vs. el pasado (más grandes primero):"
    return [titulo] + [texto for _, texto in filas[:8]]


def finanzas_como_texto() -> str | None:
    """None si todavía no hay ningún movimiento."""
    if not Movimiento.objects.exists():
        return None

    hoy = timezone.localdate()
    mes = primer_dia(hoy)
    # Todos los conceptos, para poder comparar; al texto van solo los primeros.
    actual = resumen_mes(mes, top=50)
    pasado = resumen_mes(mes_anterior(mes), top=50)

    lineas = [f"Hoy es {hoy:%Y-%m-%d} (día {hoy.day} del mes). Moneda: pesos colombianos (COP)."]
    lineas += _bloque("Mes en curso", actual, tope=8)
    if actual.gastos:
        lineas.append(
            f"- Gasto promedio por día en lo que va del mes: "
            f"{formato_pesos(round(actual.gastos / hoy.day))}."
        )
    lineas += _bloque("Mes pasado", pasado, tope=5)
    lineas += _cambios(actual, pasado)

    # Últimos 12 meses, uno por línea: para tendencias y comparaciones.
    lineas.append("Por mes, últimos 12 (ingresos / gastos / balance):")
    cursor = mes
    for _ in range(12):
        r = resumen_mes(cursor, top=0)
        if r.movimientos:
            lineas.append(
                f"- {cursor:%Y-%m}: {formato_pesos(r.ingresos)} / "
                f"{formato_pesos(r.gastos)} / {formato_pesos(r.balance)}"
            )
        cursor = mes_anterior(cursor)

    totales = {
        f["tipo"]: f
        for f in Movimiento.objects.values("tipo").annotate(total=Sum("valor"), n=Count("id"))
    }
    desde = Movimiento.objects.aggregate(desde=Min("fecha"))["desde"]
    ingresos = (totales.get("ingreso") or {}).get("total") or 0
    gastos = (totales.get("gasto") or {}).get("total") or 0
    lineas.append(
        f"Historial completo desde {desde:%Y-%m-%d}: ingresos {formato_pesos(ingresos)}, "
        f"gastos {formato_pesos(gastos)}, balance {formato_pesos(ingresos - gastos)}."
    )

    lineas.append("Últimos 15 movimientos (fecha, tipo, concepto, valor):")
    for m in Movimiento.objects.all()[:15]:
        lineas.append(f"- {m.fecha:%Y-%m-%d}, {m.tipo}, {m.concepto}, {formato_pesos(m.valor)}")

    return "\n".join(lineas)
