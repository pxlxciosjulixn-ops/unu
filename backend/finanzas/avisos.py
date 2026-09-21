"""
Correos de finanzas personales.

- Alerta de sobregasto: en cuanto los gastos del mes en curso pasan a los
  ingresos. Una vez por cruce: si el mes vuelve a quedar en positivo, la
  alerta se rearma y avisa de nuevo si se vuelve a pasar.
- Resumen del mes: cuando un mes termina, cómo cerró.

Render (plan gratis) no tiene tareas programadas y el servidor se duerme, así
que el resumen no sale a una hora fija: se revisa con cada visita al
dashboard o registro nuevo, y sale en la primera actividad del mes siguiente.
El comando `enviar_resumen_finanzas` hace lo mismo a mano o desde un cron.

El envío va en un hilo aparte: guardar un gasto no espera a Google, y si el
correo falla el movimiento queda guardado igual.
"""

from __future__ import annotations

import logging
import threading
from datetime import date
from html import escape

from django.conf import settings
from django.db import IntegrityError, close_old_connections, transaction
from django.utils import timezone

from finanzas import gmail
from finanzas.calculos import (
    ResumenMes,
    formato_pesos,
    mes_anterior,
    primer_dia,
    resumen_mes,
)
from finanzas.models import AvisoEnviado, Movimiento

logger = logging.getLogger(__name__)


def activos() -> bool:
    return settings.FINANZAS_AVISOS and gmail.configurado()


# ---------------------------------------------------------------------------
# Disparadores
# ---------------------------------------------------------------------------


def _reservar(tipo: str, mes: date) -> bool:
    """Marca el aviso como enviado. False si otro proceso ya lo hizo."""
    try:
        with transaction.atomic():
            AvisoEnviado.objects.create(tipo=tipo, mes=mes)
        return True
    except IntegrityError:
        return False


def _enviar_en_hilo(tipo: str, mes: date, armar) -> None:
    """Arma y manda el correo fuera de la petición; si falla, libera la marca."""

    def trabajo() -> None:
        try:
            asunto, texto, html = armar()
            gmail.enviar(settings.FINANZAS_CORREO_DESTINO, asunto, texto, html)
        except Exception:  # noqa: BLE001 - un correo fallido no tumba nada
            logger.exception("No se pudo mandar el aviso %s de %s", tipo, mes)
            AvisoEnviado.objects.filter(tipo=tipo, mes=mes).delete()
        finally:
            # El hilo abrió su propia conexión a la base: se cierra al salir.
            close_old_connections()

    threading.Thread(target=trabajo, daemon=True).start()


def revisar_sobregasto(hoy: date | None = None) -> bool:
    """Tras un registro: avisa si el mes en curso ya va en rojo."""
    if not activos():
        return False
    mes = primer_dia(hoy or timezone.localdate())
    resumen = resumen_mes(mes)
    tipo = AvisoEnviado.Tipo.SOBREGASTO

    if not resumen.sobregasto:
        # Volvió a quedar en positivo: la próxima vez que se pase, se avisa.
        AvisoEnviado.objects.filter(tipo=tipo, mes=mes).delete()
        return False

    if not _reservar(tipo, mes):
        return False
    _enviar_en_hilo(tipo, mes, lambda: correo_sobregasto(resumen))
    return True


def revisar_resumen_pendiente(hoy: date | None = None) -> bool:
    """Si el mes pasado tuvo movimientos y su resumen no ha salido, lo manda."""
    if not activos():
        return False
    mes = mes_anterior(hoy or timezone.localdate())
    tipo = AvisoEnviado.Tipo.RESUMEN

    # Dos consultas baratas antes de hacer nada: esto corre en cada visita.
    if AvisoEnviado.objects.filter(tipo=tipo, mes=mes).exists():
        return False
    if not Movimiento.objects.filter(
        fecha__gte=mes, fecha__lt=primer_dia(hoy or timezone.localdate())
    ).exists():
        return False

    if not _reservar(tipo, mes):
        return False
    _enviar_en_hilo(
        tipo, mes, lambda: correo_resumen(resumen_mes(mes), resumen_mes(mes_anterior(mes)))
    )
    return True


# ---------------------------------------------------------------------------
# Contenido de los correos
# ---------------------------------------------------------------------------


def _pct(valor: float | None) -> str:
    return "—" if valor is None else f"{valor:.1f} %".replace(".", ",")


def _variacion(actual: int, anterior: int) -> str | None:
    if not anterior:
        return None
    cambio = (actual - anterior) / anterior * 100
    signo = "+" if cambio > 0 else ""
    return f"{signo}{cambio:.1f} %".replace(".", ",")


def _fila(etiqueta: str, valor: str, fuerte: bool = False) -> str:
    peso = "600" if fuerte else "400"
    return (
        '<tr><td style="padding:8px 0;color:#737373">'
        f"{escape(etiqueta)}</td>"
        f'<td style="padding:8px 0;text-align:right;font-weight:{peso};'
        f'font-variant-numeric:tabular-nums">{escape(valor)}</td></tr>'
    )


def _pagina(titulo: str, intro: str, filas: list[str], resumen: ResumenMes) -> str:
    conceptos = "".join(
        _fila(f"{c.nombre} ({c.veces})", formato_pesos(c.total))
        for c in resumen.conceptos_gasto
    )
    bloque_conceptos = (
        '<p style="margin:24px 0 4px;font-size:13px;color:#737373">'
        "En qué se fue la plata</p>"
        f'<table style="width:100%;border-collapse:collapse;font-size:14px">{conceptos}</table>'
        if conceptos
        else ""
    )
    enlace = (
        f'<p style="margin:28px 0 0"><a href="{escape(settings.FINANZAS_URL_DASHBOARD)}" '
        'style="display:inline-block;background:#171717;color:#fff;text-decoration:none;'
        'padding:10px 16px;border-radius:8px;font-size:14px">Abrir el dashboard</a></p>'
        if settings.FINANZAS_URL_DASHBOARD
        else ""
    )
    return f"""\
<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#171717">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px">
<p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#737373">Mis finanzas</p>
<h1 style="margin:6px 0 8px;font-size:20px">{escape(titulo)}</h1>
<p style="margin:0 0 16px;font-size:14px;color:#525252;line-height:1.5">{escape(intro)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #e5e5e5">{"".join(filas)}</table>
{bloque_conceptos}
{enlace}
</div>
<p style="margin:12px 0 0;font-size:12px;color:#a3a3a3;text-align:center">Aviso automático de tu registro de gastos e ingresos.</p>
</div></body></html>"""


def _texto(titulo: str, intro: str, lineas: list[str], resumen: ResumenMes) -> str:
    partes = [titulo, "", intro, "", *lineas]
    if resumen.conceptos_gasto:
        partes += ["", "En qué se fue la plata:"]
        partes += [
            f"- {c.nombre} ({c.veces}): {formato_pesos(c.total)}"
            for c in resumen.conceptos_gasto
        ]
    if settings.FINANZAS_URL_DASHBOARD:
        partes += ["", f"Dashboard: {settings.FINANZAS_URL_DASHBOARD}"]
    return "\n".join(partes)


def correo_sobregasto(resumen: ResumenMes) -> tuple[str, str, str]:
    exceso = resumen.gastos - resumen.ingresos
    asunto = f"Alerta: en {resumen.nombre} vas gastando más de lo que ganas"
    titulo = "Vas gastando más de lo que ganas"
    intro = (
        f"En {resumen.nombre} los gastos ya superan a los ingresos por "
        f"{formato_pesos(exceso)}."
    )
    datos = [
        ("Ingresos del mes", formato_pesos(resumen.ingresos), False),
        ("Gastos del mes", formato_pesos(resumen.gastos), False),
        ("Diferencia", formato_pesos(resumen.balance), True),
    ]
    return (
        asunto,
        _texto(titulo, intro, [f"{e}: {v}" for e, v, _ in datos], resumen),
        _pagina(titulo, intro, [_fila(e, v, f) for e, v, f in datos], resumen),
    )


def correo_resumen(resumen: ResumenMes, anterior: ResumenMes) -> tuple[str, str, str]:
    signo = "+" if resumen.balance > 0 else ""
    asunto = f"Resumen de {resumen.nombre}: {signo}{formato_pesos(resumen.balance)}"
    titulo = f"Así cerró {resumen.nombre}"
    if resumen.sobregasto:
        intro = (
            f"Gastaste {formato_pesos(-resumen.balance)} más de lo que entró. "
            "Vale la pena mirar los conceptos más grandes."
        )
    else:
        intro = (
            f"Te quedaron libres {formato_pesos(resumen.balance)}: "
            f"ahorraste el {_pct(resumen.ahorro_pct)} de lo que entró."
        )

    cambio = _variacion(resumen.gastos, anterior.gastos)
    datos = [
        ("Ingresos", formato_pesos(resumen.ingresos), False),
        ("Gastos", formato_pesos(resumen.gastos), False),
        ("Balance", f"{signo}{formato_pesos(resumen.balance)}", True),
        ("Ahorro", _pct(resumen.ahorro_pct), False),
        ("Movimientos", str(resumen.movimientos), False),
    ]
    if cambio:
        datos.append((f"Gastos vs. {anterior.nombre}", cambio, False))
    return (
        asunto,
        _texto(titulo, intro, [f"{e}: {v}" for e, v, _ in datos], resumen),
        _pagina(titulo, intro, [_fila(e, v, f) for e, v, f in datos], resumen),
    )
