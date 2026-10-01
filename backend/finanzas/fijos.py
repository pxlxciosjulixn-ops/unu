"""
Cuentas de los gastos fijos (Mamá, arriendo, el préstamo de un amigo…):
cuánto se debe este mes, cuánto el siguiente y cómo fue cada mes.

Cada mes activo se debe el monto fijo. Un gasto con el concepto es un pago y
lo llena; un ingreso con el concepto es un préstamo de esa persona y se suma a
lo que se le debe ese mes. Lo que no se completa pasa al mes siguiente; lo
pagado de más no (suele ser plata que se debía por fuera y no quedó anotada).

Un gasto fijo puede durar para siempre, un solo mes o hasta un mes dado
(`fecha_fin`). Pasado ese mes ya no se suma el monto, pero lo que haya quedado
debiendo se sigue arrastrando hasta que se pague.
"""

from __future__ import annotations

from datetime import date

from finanzas.calculos import mes_siguiente, primer_dia
from finanzas.conceptos import clave
from finanzas.models import GastoFijo, Movimiento

MESES_DE_HISTORIAL = 6


def activo_en(fijo: GastoFijo, mes: date) -> bool:
    """Si en ese mes se debe el monto fijo."""
    if mes < primer_dia(fijo.fecha_inicio):
        return False
    return fijo.fecha_fin is None or mes <= primer_dia(fijo.fecha_fin)


def estado(fijo: GastoFijo, hoy: date) -> dict:
    """Lo del mes en curso, lo que viene el siguiente y el historial."""
    actual = primer_dia(hoy)
    siguiente = mes_siguiente(actual)
    inicio = primer_dia(fijo.fecha_inicio)

    # Todavía no empieza (el préstamo que se paga en noviembre).
    if inicio > actual:
        return {
            "este_mes": None,
            "estado": "programado",
            "historial": [],
            "pendiente_mes": 0,
            "proximo": {"mes": f"{inicio:%Y-%m}", "valor": fijo.monto},
            "siguiente": fijo.monto if inicio == siguiente else 0,
        }

    pagos: dict[date, int] = {}
    prestamos: dict[date, int] = {}
    for m in Movimiento.objects.filter(fecha__gte=inicio, fecha__lt=siguiente):
        if clave(m.concepto) != fijo.clave:
            continue
        destino = pagos if m.tipo == Movimiento.Tipo.GASTO else prestamos
        mes = primer_dia(m.fecha)
        destino[mes] = destino.get(mes, 0) + m.valor

    meses = []
    arrastre = 0
    mes = inicio
    while mes <= actual:
        pagado = pagos.get(mes, 0)
        prestado = prestamos.get(mes, 0)
        monto = fijo.monto if activo_en(fijo, mes) else 0
        total = arrastre + monto + prestado
        meses.append(
            {
                "mes": f"{mes:%Y-%m}",
                "arrastre": arrastre,
                "monto": monto,
                "prestado": prestado,
                "pagado": pagado,
                "total": total,
                "pendiente": total - pagado,
            }
        )
        # Lo que falta pasa; lo pagado de más no.
        arrastre = max(total - pagado, 0)
        mes = mes_siguiente(mes)

    este = meses[-1]
    pendiente = max(este["pendiente"], 0)
    sigue = activo_en(fijo, siguiente)
    if pendiente > 0:
        situacion = "parcial" if este["pagado"] > 0 else "pendiente"
    elif este["monto"] == 0 and not sigue:
        situacion = "terminado"
    else:
        situacion = "pagado"

    if pendiente > 0:
        proximo = {"mes": este["mes"], "valor": pendiente}
    elif sigue:
        proximo = {"mes": f"{siguiente:%Y-%m}", "valor": fijo.monto}
    else:
        proximo = None
    return {
        "este_mes": este,
        "estado": situacion,
        "historial": meses[-MESES_DE_HISTORIAL:],
        "pendiente_mes": pendiente,
        "proximo": proximo,
        "siguiente": fijo.monto if sigue else 0,
    }
