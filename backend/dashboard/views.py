"""
Endpoints del dashboard. Todo se calcula con agregaciones en la base; la API
no devuelve numeros inventados ni calculados en el frontend.
"""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from dashboard import models
from dashboard.serializers import OrderSerializer, ProductOverviewSerializer

MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]
MESES_CORTOS = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
]

DINERO = DecimalField(max_digits=16, decimal_places=2)
CERO = Value(Decimal("0"), output_field=DINERO)


def _primer_dia(fecha: dt.date) -> dt.date:
    return fecha.replace(day=1)


def _sumar_meses(fecha: dt.date, meses: int) -> dt.date:
    total = fecha.year * 12 + (fecha.month - 1) + meses
    return dt.date(total // 12, total % 12 + 1, 1)


def _rango_mes(mes: dt.date) -> tuple[dt.datetime, dt.datetime]:
    """Intervalo [inicio, fin) del mes en la zona horaria del proyecto."""
    tz = timezone.get_current_timezone()
    inicio = timezone.make_aware(dt.datetime.combine(mes, dt.time.min), tz)
    fin = timezone.make_aware(
        dt.datetime.combine(_sumar_meses(mes, 1), dt.time.min), tz
    )
    return inicio, fin


def _etiqueta_mes(mes: dt.date, corta: bool = False) -> str:
    nombres = MESES_CORTOS if corta else MESES
    return f"{nombres[mes.month - 1]} {mes.year}"


def _variacion(actual: Decimal | int, previo: Decimal | int) -> float | None:
    """Variacion porcentual; None cuando no hay base de comparacion."""
    if not previo:
        return None
    return round(float(actual - previo) / float(previo) * 100, 1)


def _pais(request: Request) -> str:
    """Codigo ISO de dos letras de `?country=`, o cadena vacia."""
    valor = (request.query_params.get("country") or "").strip().upper()
    return valor if len(valor) == 2 else ""


def _estado_pedido(request: Request) -> str:
    """
    Estado de `?order_status=` cuando corresponde a uno valido.

    Se llama distinto a `?status=` de productos para que el tablero pueda
    mandar los dos filtros en la misma URL sin pisarse.
    """
    valor = (request.query_params.get("order_status") or "").strip()
    return valor if valor in models.Order.Status.values else ""


def _ventana(request: Request) -> int:
    """Cantidad de meses de la ventana de analisis (`?months=`)."""
    try:
        return max(3, min(int(request.query_params.get("months", 12)), 36))
    except (TypeError, ValueError):
        return 12


def _pedidos(request: Request):
    """Pedidos ya filtrados por el pais seleccionado."""
    qs = models.Order.objects.all()
    pais = _pais(request)
    if pais:
        qs = qs.filter(customer__country_code=pais)
    return qs


def _mes_solicitado(request: Request) -> dt.date:
    """
    Mes a consultar: `?month=AAAA-MM`, o el ultimo mes con pedidos.

    El resultado se guarda en la peticion HTTP subyacente porque `/overview/`
    reutiliza la misma peticion para las cinco vistas: sin la cache, cada una
    repetiria la consulta del ultimo pedido contra la base remota.
    """
    crudo = request.query_params.get("month")
    if crudo:
        try:
            anio, mes = crudo.split("-")
            return dt.date(int(anio), int(mes), 1)
        except (ValueError, TypeError):
            pass

    peticion = getattr(request, "_request", request)
    guardado = getattr(peticion, "_dashboard_mes", None)
    if guardado is not None:
        return guardado

    ultimo = (
        models.Order.objects.order_by("-placed_at")
        .values_list("placed_at", flat=True)
        .first()
    )
    mes = (
        _primer_dia(timezone.localtime(ultimo).date())
        if ultimo
        else _primer_dia(timezone.localdate())
    )
    peticion._dashboard_mes = mes
    return mes


@api_view(["GET"])
def summary(request: Request) -> Response:
    """Indicadores del mes con su comparacion contra el mes anterior."""
    mes = _mes_solicitado(request)
    anterior = _sumar_meses(mes, -1)

    pedidos_qs = _pedidos(request)

    # Una sola consulta agrupada por mes para el mes actual y el anterior: la
    # base es remota y cada viaje de ida y vuelta cuesta cientos de ms.
    inicio_previo, _ = _rango_mes(anterior)
    _, fin_actual = _rango_mes(mes)

    ventas_por_mes = {
        timezone.localtime(fila["mes"]).date().replace(day=1): fila
        for fila in pedidos_qs.filter(
            status=models.Order.Status.PAID,
            placed_at__gte=inicio_previo,
            placed_at__lt=fin_actual,
        )
        .annotate(mes=TruncMonth("placed_at"))
        .values("mes")
        .annotate(ingresos=Coalesce(Sum("total"), CERO), pedidos=Count("id"))
    }
    vacio = {"ingresos": Decimal("0"), "pedidos": 0}
    actual = ventas_por_mes.get(mes, vacio)
    previo = ventas_por_mes.get(anterior, vacio)

    trafico_por_mes = {
        fila["mes"]: fila["vistas"]
        for fila in models.DailyTraffic.objects.filter(
            date__gte=anterior, date__lt=_sumar_meses(mes, 1)
        )
        .annotate(mes=TruncMonth("date"))
        .values("mes")
        .annotate(vistas=Coalesce(Sum("page_views"), Value(0)))
    }
    visitas_actual = trafico_por_mes.get(mes, 0)
    visitas_previo = trafico_por_mes.get(anterior, 0)

    meta = (
        None
        if _pais(request)
        else models.MonthlyTarget.objects.filter(month=mes).first()
    )

    ticket_actual = (
        actual["ingresos"] / actual["pedidos"] if actual["pedidos"] else Decimal("0")
    )
    ticket_previo = (
        previo["ingresos"] / previo["pedidos"] if previo["pedidos"] else Decimal("0")
    )

    def progreso(valor, objetivo) -> float | None:
        if not objetivo:
            return None
        return round(min(float(valor) / float(objetivo) * 100, 999), 1)

    return Response(
        {
            "month": mes.strftime("%Y-%m"),
            "month_label": _etiqueta_mes(mes),
            "previous_month_label": _etiqueta_mes(anterior),
            "country": _pais(request),
            "targets_available": meta is not None,
            # El mes en curso va incompleto: el frontend lo advierte para que
            # nadie lea la caida contra el mes anterior como un desplome.
            "partial": mes == _primer_dia(timezone.localdate()),
            "cards": [
                {
                    "key": "revenue",
                    "label": "Ingresos del mes",
                    "value": actual["ingresos"],
                    "format": "currency",
                    "previous": previo["ingresos"],
                    "change_pct": _variacion(actual["ingresos"], previo["ingresos"]),
                    "target": meta.revenue if meta else None,
                    "target_pct": progreso(actual["ingresos"], meta.revenue if meta else None),
                },
                {
                    "key": "orders",
                    "label": "Pedidos pagados",
                    "value": actual["pedidos"],
                    "format": "number",
                    "previous": previo["pedidos"],
                    "change_pct": _variacion(actual["pedidos"], previo["pedidos"]),
                    "target": meta.orders if meta else None,
                    "target_pct": progreso(actual["pedidos"], meta.orders if meta else None),
                },
                {
                    "key": "visits",
                    "label": "Paginas vistas",
                    "value": visitas_actual,
                    "format": "number",
                    "previous": visitas_previo,
                    "change_pct": _variacion(visitas_actual, visitas_previo),
                    "target": meta.visits if meta else None,
                    "target_pct": progreso(visitas_actual, meta.visits if meta else None),
                },
                {
                    "key": "avg_ticket",
                    "label": "Ticket promedio",
                    "value": round(ticket_actual, 2),
                    "format": "currency",
                    "previous": round(ticket_previo, 2),
                    "change_pct": _variacion(ticket_actual, ticket_previo),
                    "target": None,
                    "target_pct": None,
                },
            ],
        }
    )


@api_view(["GET"])
def sales_series(request: Request) -> Response:
    """Meta, venta real y cumplimiento por mes."""
    meses = _ventana(request)

    fin_mes = _mes_solicitado(request)
    desde = _sumar_meses(fin_mes, -(meses - 1))
    inicio, _ = _rango_mes(desde)
    _, fin = _rango_mes(fin_mes)

    filas = (
        _pedidos(request)
        .filter(placed_at__gte=inicio, placed_at__lt=fin)
        .annotate(mes=TruncMonth("placed_at"))
        .values("mes")
        .annotate(
            ventas=Coalesce(Sum("total", filter=Q(status=models.Order.Status.PAID)), CERO),
            devoluciones=Coalesce(
                Sum("total", filter=Q(status=models.Order.Status.REFUNDED)), CERO
            ),
            pedidos=Count("id", filter=Q(status=models.Order.Status.PAID)),
        )
    )
    por_mes = {
        timezone.localtime(f["mes"]).date().replace(day=1): f for f in filas
    }

    # Sin metas por pais: el cumplimiento solo aplica al negocio completo.
    con_metas = not _pais(request)
    metas = (
        {
            m.month: m.revenue
            for m in models.MonthlyTarget.objects.filter(
                month__gte=desde, month__lte=fin_mes
            )
        }
        if con_metas
        else {}
    )

    serie = []
    for i in range(meses):
        mes = _sumar_meses(desde, i)
        fila = por_mes.get(mes)
        ventas = fila["ventas"] if fila else Decimal("0")
        meta = metas.get(mes)
        serie.append(
            {
                "month": mes.strftime("%Y-%m"),
                "label": _etiqueta_mes(mes, corta=True),
                "sales": ventas,
                "refunds": fila["devoluciones"] if fila else Decimal("0"),
                "orders": fila["pedidos"] if fila else 0,
                "target": meta,
                "compliance_pct": (
                    round(float(ventas) / float(meta) * 100, 1) if meta else None
                ),
                "gap": (ventas - meta) if meta is not None else None,
            }
        )

    return Response(
        {"months": meses, "targets_available": con_metas, "series": serie}
    )


@api_view(["GET"])
def profit(request: Request) -> Response:
    """Ingresos contra gastos del mes y de los cinco anteriores."""
    mes = _mes_solicitado(request)
    desde = _sumar_meses(mes, -5)
    inicio_ventana, _ = _rango_mes(desde)
    _, fin_ventana = _rango_mes(mes)

    # Toda la ventana en una consulta agrupada, y los gastos en otra.
    ingresos_por_mes = {
        timezone.localtime(fila["mes"]).date().replace(day=1): fila["total"]
        for fila in models.Order.objects.filter(
            status=models.Order.Status.PAID,
            placed_at__gte=inicio_ventana,
            placed_at__lt=fin_ventana,
        )
        .annotate(mes=TruncMonth("placed_at"))
        .values("mes")
        .annotate(total=Coalesce(Sum("total"), CERO))
    }
    gastos_por_mes = {
        gasto.month: gasto.amount
        for gasto in models.MonthlyExpense.objects.filter(
            month__gte=desde, month__lte=mes
        )
    }

    ingresos = ingresos_por_mes.get(mes, Decimal("0"))
    gastos = gastos_por_mes.get(mes, Decimal("0"))
    utilidad = ingresos - gastos
    margen = round(float(utilidad) / float(ingresos) * 100, 1) if ingresos else None

    historial = []
    for i in range(5, -1, -1):
        m = _sumar_meses(mes, -i)
        historial.append(
            {
                "month": m.strftime("%Y-%m"),
                "label": _etiqueta_mes(m, corta=True),
                "income": ingresos_por_mes.get(m, Decimal("0")),
                "expenses": gastos_por_mes.get(m, Decimal("0")),
            }
        )

    return Response(
        {
            "month": mes.strftime("%Y-%m"),
            "month_label": _etiqueta_mes(mes),
            "income": ingresos,
            "expenses": gastos,
            "profit": utilidad,
            "margin_pct": margen,
            "history": historial,
        }
    )


@api_view(["GET"])
def countries(request: Request) -> Response:
    """
    Ventas por pais del cliente en la ventana seleccionada.

    No se filtra por `?country=`: este panel es justamente el desglose por
    pais, y ocultar los demas dejaria un solo dato.
    """
    try:
        limite = max(3, min(int(request.query_params.get("limit", 12)), 30))
    except (TypeError, ValueError):
        limite = 12

    meses = _ventana(request)
    fin_mes = _mes_solicitado(request)
    desde = _sumar_meses(fin_mes, -(meses - 1))
    inicio, _ = _rango_mes(desde)
    _, fin = _rango_mes(fin_mes)

    filas = list(
        models.Order.objects.filter(
            status=models.Order.Status.PAID,
            placed_at__gte=inicio,
            placed_at__lt=fin,
        )
        .values(
            country=F("customer__country"), country_code=F("customer__country_code")
        )
        .annotate(revenue=Coalesce(Sum("total"), CERO), orders=Count("id"))
        .order_by("-revenue")
    )
    total = sum(f["revenue"] for f in filas) or Decimal("1")

    resultado = [
        {
            **f,
            "share_pct": round(float(f["revenue"]) / float(total) * 100, 1),
        }
        for f in filas[:limite]
    ]
    return Response(
        {
            "total_revenue": total,
            "months": meses,
            "from": desde.strftime("%Y-%m"),
            "to": fin_mes.strftime("%Y-%m"),
            "results": resultado,
        }
    )


@api_view(["GET"])
def recent_orders(request: Request) -> Response:
    """Ultimos pedidos, filtrables por pais y por estado."""
    try:
        limite = max(3, min(int(request.query_params.get("limit", 8)), 50))
    except (TypeError, ValueError):
        limite = 8

    pedidos = _pedidos(request).select_related("customer")
    estado = _estado_pedido(request)
    if estado:
        pedidos = pedidos.filter(status=estado)

    return Response(
        {
            "status": estado,
            "results": OrderSerializer(
                pedidos.order_by("-placed_at")[:limite], many=True
            ).data,
        }
    )


class ProductOverview(ListAPIView):
    """
    Catalogo con unidades vendidas e ingresos por producto.

    Acepta `?search=` (nombre, SKU o categoria), `?status=`, `?country=` y
    `?ordering=` entre `revenue`, `units_sold`, `name` y `price` (con `-` para
    descendente).
    """

    serializer_class = ProductOverviewSerializer
    ORDENES = {"revenue", "units_sold", "name", "price"}

    def get_queryset(self):
        pagados = Q(items__order__status=models.Order.Status.PAID)
        pais = _pais(self.request)
        if pais:
            # Unidades e ingresos solo de los pedidos de ese pais.
            pagados &= Q(items__order__customer__country_code=pais)
        qs = models.Product.objects.annotate(
            units_sold=Coalesce(Sum("items__quantity", filter=pagados), Value(0)),
            revenue=Coalesce(
                Sum(
                    F("items__quantity") * F("items__unit_price"),
                    filter=pagados,
                    output_field=DINERO,
                ),
                CERO,
            ),
        )

        buscar = self.request.query_params.get("search", "").strip()
        if buscar:
            qs = qs.filter(
                Q(name__icontains=buscar)
                | Q(sku__icontains=buscar)
                | Q(category__icontains=buscar)
            )

        estado = self.request.query_params.get("status", "").strip()
        if estado in models.Product.Status.values:
            qs = qs.filter(status=estado)

        orden = self.request.query_params.get("ordering", "-revenue")
        if orden.lstrip("-") not in self.ORDENES:
            orden = "-revenue"
        return qs.order_by(orden, "name")


@api_view(["GET"])
def filters(request: Request) -> Response:
    """Opciones para los selectores del tablero, tomadas de los datos reales."""
    meses = [
        timezone.localtime(fila["mes"]).date().replace(day=1)
        for fila in models.Order.objects.annotate(mes=TruncMonth("placed_at"))
        .values("mes")
        .distinct()
        .order_by("-mes")
    ]

    paises = (
        models.Order.objects.values(
            country=F("customer__country"), country_code=F("customer__country_code")
        )
        .annotate(orders=Count("id"))
        .order_by("-orders")
    )

    return Response(
        {
            "months": [
                {"value": mes.strftime("%Y-%m"), "label": _etiqueta_mes(mes)}
                for mes in meses
            ],
            "countries": list(paises),
            "order_statuses": [
                {"value": valor, "label": etiqueta}
                for valor, etiqueta in models.Order.Status.choices
            ],
            "windows": [6, 12, 24],
        }
    )


@api_view(["GET"])
def overview(request: Request) -> Response:
    """
    Todo el dashboard en una sola llamada, para que la pagina no dispare
    seis peticiones en paralelo al cargar.
    """
    peticiones = [
        ("summary", summary),
        ("sales", sales_series),
        ("profit", profit),
        ("countries", countries),
        ("recent_orders", recent_orders),
        ("filters", filters),
    ]
    payload = {}
    for clave, vista in peticiones:
        respuesta = vista(request._request)
        if respuesta.status_code != status.HTTP_200_OK:
            return respuesta
        payload[clave] = respuesta.data
    return Response(payload)
