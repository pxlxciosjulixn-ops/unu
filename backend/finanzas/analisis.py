"""
Análisis sobre el historial: pagos que se repiten, proyección del mes, deudas,
presupuestos y gastos fuera de lo normal.

Los usan el asistente de IA y el correo del resumen. El dashboard hace las
mismas cuentas en el navegador (`finanzas/analisis.ts`); si se cambia una
regla aquí, hay que cambiarla allá.
"""

from __future__ import annotations

import calendar
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, timedelta
from statistics import median

from django.db.models import Sum

from finanzas.calculos import mes_anterior, primer_dia
from finanzas.conceptos import clave, grupos as grupos_de_sugerencias, mapa
from finanzas.models import Movimiento, Sugerencia

# Cuántos meses cerrados se miran para decidir que algo se repite.
MESES_RECURRENCIA = 4


@dataclass
class Recurrente:
    concepto: str
    tipo: str
    # Lo típico de un mes (la mediana de los meses en que hubo).
    monto: int
    meses: int
    pagado_este_mes: int

    @property
    def pendiente(self) -> int:
        """Lo que falta para llegar a lo típico (un sueldo por quincenas)."""
        return max(0, self.monto - self.pagado_este_mes)


def saldo_anterior(mes: date) -> int:
    """
    Con cuánto se entra al mes: todo lo que entró menos todo lo que salió
    antes del día 1. Lo que sobró en septiembre (y lo que venía de agosto…)
    arranca octubre. Negativo si se viene arrastrando un faltante.

    No se guarda como movimiento: se calcula, así que corregir un gasto viejo
    cambia solo el saldo de los meses siguientes.
    """
    totales = dict(
        Movimiento.objects.filter(fecha__lt=primer_dia(mes))
        .values("tipo")
        .annotate(total=Sum("valor"))
        .values_list("tipo", "total")
    )
    return (totales.get(Movimiento.Tipo.INGRESO) or 0) - (
        totales.get(Movimiento.Tipo.GASTO) or 0
    )


@dataclass
class Proyeccion:
    ingresos: int
    gastos: int
    ingresos_final: int
    gastos_final: int
    ritmo_diario: int
    dias_restantes: int
    pendientes: list[Recurrente]
    # Lo que sobró de los meses anteriores y entra a este.
    saldo_anterior: int = 0

    @property
    def balance_final(self) -> int:
        """Con cuánto se terminaría el mes, contando lo que venía de antes."""
        return self.saldo_anterior + self.ingresos_final - self.gastos_final


def _movimientos(desde: date, hasta: date) -> list[Movimiento]:
    """Del día `desde` al día anterior a `hasta`."""
    return list(Movimiento.objects.filter(fecha__gte=desde, fecha__lt=hasta))


def _meses_cerrados(mes: date, n: int) -> list[date]:
    """Los `n` meses anteriores a `mes`, del más viejo al más nuevo."""
    meses = []
    cursor = mes
    for _ in range(n):
        cursor = mes_anterior(cursor)
        meses.append(cursor)
    return list(reversed(meses))


def recurrentes(hoy: date) -> list[Recurrente]:
    """
    Lo que aparece casi todos los meses: en 3 de los últimos 4 meses cerrados,
    o en todos si el historial es más corto (y por lo menos 2).
    """
    mes = primer_dia(hoy)
    primero = Movimiento.objects.order_by("fecha").values_list("fecha", flat=True).first()
    if primero is None:
        return []
    meses = [m for m in _meses_cerrados(mes, MESES_RECURRENCIA) if m >= primer_dia(primero)]
    if len(meses) < 2:
        return []
    umbral = 3 if len(meses) >= 4 else len(meses)

    por_mes: dict[tuple[str, str], dict[date, int]] = defaultdict(lambda: defaultdict(int))
    nombres: dict[tuple[str, str], str] = {}
    sugerencias = mapa()
    siguiente = date(mes.year + (mes.month == 12), mes.month % 12 + 1, 1)
    for m in _movimientos(meses[0], siguiente):
        llave = (m.tipo, clave(m.concepto))
        por_mes[llave][primer_dia(m.fecha)] += m.valor
        nombres.setdefault(llave, sugerencias.get(llave[1]) or m.concepto)

    lista = []
    for llave, totales in por_mes.items():
        en_meses = [totales[m] for m in meses if totales.get(m)]
        if len(en_meses) < umbral:
            continue
        lista.append(
            Recurrente(
                concepto=nombres[llave],
                tipo=llave[0],
                monto=round(median(en_meses)),
                meses=len(en_meses),
                pagado_este_mes=totales.get(mes, 0),
            )
        )
    lista.sort(key=lambda r: -r.monto)
    return lista


def proyeccion(hoy: date, recs: list[Recurrente] | None = None) -> Proyeccion:
    """
    Cómo cerraría el mes en curso.

    De lo que se repite cada mes se suma lo que falta para lo típico; el resto
    del gasto se estira al ritmo diario que lleva el mes. Los primeros días
    ese ritmo dice poco, así que se mezcla con el de los meses anteriores
    hasta la mitad del mes.
    """
    if recs is None:
        recs = recurrentes(hoy)
    mes = primer_dia(hoy)
    dias_mes = calendar.monthrange(hoy.year, hoy.month)[1]
    siguiente = mes + timedelta(days=dias_mes)
    fijos = {clave(r.concepto) for r in recs if r.tipo == Movimiento.Tipo.GASTO}

    ingresos = gastos = variable = 0
    for m in _movimientos(mes, siguiente):
        if m.tipo == Movimiento.Tipo.INGRESO:
            ingresos += m.valor
        else:
            gastos += m.valor
            if clave(m.concepto) not in fijos:
                variable += m.valor
    ritmo = variable / hoy.day

    # Ritmo de los 3 meses anteriores, sin los pagos fijos.
    previos = _meses_cerrados(mes, 3)
    historico = sum(
        m.valor
        for m in _movimientos(previos[0], mes)
        if m.tipo == Movimiento.Tipo.GASTO and clave(m.concepto) not in fijos
    )
    primero = Movimiento.objects.order_by("fecha").values_list("fecha", flat=True).first()
    dias_hist = (mes - max(previos[0], primero or mes)).days
    if dias_hist > 0:
        peso = min(hoy.day / 15, 1)
        ritmo = ritmo * peso + historico / dias_hist * (1 - peso)

    restantes = dias_mes - hoy.day
    pendientes = [r for r in recs if r.pendiente]
    return Proyeccion(
        ingresos=ingresos,
        gastos=gastos,
        ingresos_final=ingresos
        + sum(r.pendiente for r in pendientes if r.tipo == Movimiento.Tipo.INGRESO),
        gastos_final=round(
            gastos
            + ritmo * restantes
            + sum(r.pendiente for r in pendientes if r.tipo == Movimiento.Tipo.GASTO)
        ),
        ritmo_diario=round(ritmo),
        dias_restantes=restantes,
        pendientes=pendientes,
        saldo_anterior=saldo_anterior(mes),
    )


def estimar_mes(mes: date) -> tuple[int, int] | None:
    """
    (ingresos, gastos) esperados para un mes que todavía no empieza: lo que
    se repite más el promedio del resto en los 3 meses anteriores (los que
    tengan datos). `None` sin al menos dos meses con datos: con uno solo, y
    a medias, no hay de dónde sacar un promedio.
    """
    recs = recurrentes(mes)
    fijos = {clave(r.concepto) for r in recs}
    previos = _meses_cerrados(mes, 3)
    movimientos = _movimientos(previos[0], mes)
    con_datos = {primer_dia(m.fecha) for m in movimientos}
    if len(con_datos) < 2:
        return None
    resto = sum(
        m.valor
        for m in movimientos
        if m.tipo == Movimiento.Tipo.GASTO and clave(m.concepto) not in fijos
    )
    ingresos = sum(r.monto for r in recs if r.tipo == Movimiento.Tipo.INGRESO)
    gastos = sum(r.monto for r in recs if r.tipo == Movimiento.Tipo.GASTO) + round(
        resto / len(con_datos)
    )
    return ingresos, gastos


def por_grupo(desde: date, hasta: date) -> dict[str, int]:
    """Gasto de cada grupo entre dos fechas (hasta sin incluir)."""
    grupos = grupos_de_sugerencias()
    totales: dict[str, int] = defaultdict(int)
    for m in _movimientos(desde, hasta):
        if m.tipo == Movimiento.Tipo.GASTO:
            totales[grupos.get(clave(m.concepto), "otro")] += m.valor
    return dict(totales)


NOMBRES_GRUPO = dict(Sugerencia.Grupo.choices)


@dataclass
class EstadoPresupuesto:
    concepto: str
    tope: int
    gastado: int

    @property
    def pct(self) -> float:
        return self.gastado / self.tope * 100


def presupuestos(mes: date) -> list[EstadoPresupuesto]:
    """Cada concepto con tope y cuánto lleva en ese mes, del más pasado al menos."""
    topes = {
        s.clave: s for s in Sugerencia.objects.filter(presupuesto__isnull=False)
    }
    if not topes:
        return []
    gastado: dict[str, int] = defaultdict(int)
    siguiente = date(mes.year + (mes.month == 12), mes.month % 12 + 1, 1)
    for m in _movimientos(mes, siguiente):
        if m.tipo == Movimiento.Tipo.GASTO:
            gastado[clave(m.concepto)] += m.valor
    estados = [
        EstadoPresupuesto(concepto=s.nombre, tope=s.presupuesto, gastado=gastado[k])
        for k, s in topes.items()
    ]
    estados.sort(key=lambda e: -e.pct)
    return estados


def fuera_de_lo_normal(hoy: date, dias: int = 60) -> list[tuple[Movimiento, int]]:
    """
    Gastos recientes de por lo menos el doble de lo usual en su concepto
    (la mediana de los demás, con 3 o más para comparar). Va con esa mediana.
    """
    por_concepto: dict[str, list[Movimiento]] = defaultdict(list)
    for m in Movimiento.objects.filter(tipo=Movimiento.Tipo.GASTO):
        por_concepto[clave(m.concepto)].append(m)

    desde = hoy - timedelta(days=dias)
    raros = []
    for lista in por_concepto.values():
        if len(lista) < 4:
            continue
        for m in lista:
            if m.fecha < desde:
                continue
            usual = median(o.valor for o in lista if o.pk != m.pk)
            if m.valor >= usual * 2 and m.valor - usual >= 20_000:
                raros.append((m, round(usual)))
    raros.sort(key=lambda par: par[0].fecha, reverse=True)
    return raros
