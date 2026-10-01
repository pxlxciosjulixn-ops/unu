"""
Las finanzas en texto, para el asistente de IA.

Se arma en cada pregunta con lo que hay en la base, así que el asistente
responde con el último gasto registrado. Va resumido (unos pocos miles de
caracteres) porque se manda completo en cada turno.
"""

from __future__ import annotations

import math

from django.db.models import Count, Min, Sum
from django.utils import timezone

from finanzas import analisis
from finanzas.calculos import (
    ResumenMes,
    formato_pesos,
    mes_anterior,
    primer_dia,
    resumen_mes,
)
from finanzas.models import Credito, Movimiento


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

    lineas += _analisis(hoy, mes, actual)

    lineas.append("Últimos 15 movimientos (fecha, tipo, concepto, valor):")
    for m in Movimiento.objects.all()[:15]:
        lineas.append(f"- {m.fecha:%Y-%m-%d}, {m.tipo}, {m.concepto}, {formato_pesos(m.valor)}")

    return "\n".join(lineas)


def _analisis(hoy, mes, actual: ResumenMes) -> list[str]:
    """Lo mismo que muestra el dashboard: proyección, deudas, grupos, topes."""
    lineas: list[str] = []
    recs = analisis.recurrentes(hoy)
    p = analisis.proyeccion(hoy, recs)
    lineas.append(
        f"Saldo con que se entró a este mes (lo que sobró de los anteriores): "
        f"{formato_pesos(p.saldo_anterior)}. No es un movimiento: se calcula solo."
    )
    lineas.append(
        f"Proyección al cierre de este mes, contando ese saldo: "
        f"ingresos {formato_pesos(p.ingresos_final)}, "
        f"gastos {formato_pesos(p.gastos_final)}, balance {formato_pesos(p.balance_final)} "
        f"(gasto variable de {formato_pesos(p.ritmo_diario)} por día, "
        f"{p.dias_restantes} días restantes)."
    )
    if p.pendientes:
        lineas.append(
            "- Lo que falta este mes de lo que se repite cada mes (ya sumado): "
            + "; ".join(
                f"{r.concepto} ({r.tipo}) {formato_pesos(r.pendiente)}" for r in p.pendientes
            )
        )
    if recs:
        lineas.append(
            "Lo que se repite casi todos los meses (monto típico): "
            + "; ".join(f"{r.concepto} ({r.tipo}) {formato_pesos(r.monto)}" for r in recs[:12])
        )

    # Grupos del mes en curso y deudas de los últimos 6 meses.
    siguiente = analisis.date(mes.year + (mes.month == 12), mes.month % 12 + 1, 1)
    grupos = analisis.por_grupo(mes, siguiente)
    if grupos:
        lineas.append(
            "Gasto por grupo este mes: "
            + "; ".join(
                f"{analisis.NOMBRES_GRUPO.get(g, g)} {formato_pesos(v)}"
                for g, v in sorted(grupos.items(), key=lambda par: -par[1])
            )
        )
    lineas.append("Pagos a deudas por mes, últimos 6 (pagado / % de los ingresos):")
    cursor = mes
    for _ in range(6):
        fin = analisis.date(cursor.year + (cursor.month == 12), cursor.month % 12 + 1, 1)
        deuda = analisis.por_grupo(cursor, fin).get("deuda", 0)
        ingresos = resumen_mes(cursor, top=0).ingresos
        pct = f"{deuda / ingresos * 100:.1f} %" if ingresos else "sin ingresos"
        lineas.append(f"- {cursor:%Y-%m}: {formato_pesos(deuda)} / {pct}")
        cursor = mes_anterior(cursor)

    lineas += _creditos()

    topes = analisis.presupuestos(mes)
    if topes:
        lineas.append("Presupuestos de este mes (gastado / tope):")
        lineas += [
            f"- {e.concepto}: {formato_pesos(e.gastado)} / {formato_pesos(e.tope)} "
            f"({e.pct:.0f} %)"
            for e in topes
        ]

    raros = analisis.fuera_de_lo_normal(hoy)
    if raros:
        lineas.append("Gastos recientes muy por encima de lo usual en su concepto:")
        lineas += [
            f"- {m.fecha:%Y-%m-%d} {m.concepto} {formato_pesos(m.valor)} "
            f"(lo usual: {formato_pesos(usual)})"
            for m, usual in raros[:5]
        ]
    return lineas


def _creditos() -> list[str]:
    """Lo que se debe en cada crédito, con su saldo al día."""
    from finanzas.serializers import CreditoSerializer

    datos = CreditoSerializer(Credito.objects.all(), many=True).data
    if not datos:
        return []
    total = sum(c["saldo"] for c in datos)
    lineas = [
        f"Créditos (saldo total {formato_pesos(total)}). Un gasto con el concepto "
        "del crédito es un abono y baja la deuda; un ingreso es un avance y la sube:"
    ]
    for c in datos:
        partes = [
            f"saldo {formato_pesos(c['saldo'])}",
            f"abonado {formato_pesos(c['abonado'])}",
            f"avances {formato_pesos(c['avances'])} desde {c['fecha_inicio']}",
        ]
        if c["cupo"]:
            partes.append(f"cupo {formato_pesos(c['cupo'])}")
        if c["cuota"]:
            partes.append(f"cuota {formato_pesos(c['cuota'])} al mes")
        partes += _intereses(c)
        lineas.append(f"- {c['nombre']}: " + ", ".join(partes))
    return lineas


def _intereses(c: dict) -> list[str]:
    """
    Tasa, interés de este mes y cuánto falta con la cuota actual, ya
    calculados: el modelo se equivoca haciendo amortizaciones de cabeza.
    """
    if c["tasa_ea"] is None:
        return ["tasa desconocida (no registrada)"]
    ea = float(c["tasa_ea"]) / 100
    mensual = (1 + ea) ** (1 / 12) - 1
    saldo = max(c["saldo"], 0)
    partes = [
        f"tasa {float(c['tasa_ea']):.2f} % E.A. ({mensual * 100:.2f} % mensual)",
        f"interés aproximado este mes {formato_pesos(round(saldo * mensual))}",
    ]
    cuota = c["cuota"]
    if not cuota or not saldo:
        return partes
    if mensual == 0:
        meses = math.ceil(saldo / cuota)
    elif cuota <= saldo * mensual:
        return partes + ["con esa cuota la deuda NO baja: no alcanza ni para los intereses"]
    else:
        meses = math.ceil(-math.log(1 - mensual * saldo / cuota) / math.log(1 + mensual))
    partes.append(
        f"con esa cuota termina en unos {meses} meses y paga unos "
        f"{formato_pesos(max(0, round(meses * cuota - saldo)))} de intereses"
    )
    return partes


def creditos_como_texto() -> str | None:
    """
    Lo que lee el asesor de créditos: las deudas y, si hay movimientos, el
    resumen de finanzas (que ya trae los créditos). None si no hay nada.
    """
    finanzas = finanzas_como_texto()
    if finanzas is not None:
        return finanzas
    lineas = _creditos()
    return "\n".join(lineas) if lineas else None
