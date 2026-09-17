"""
Siembra datos de prueba para el dashboard.

    python manage.py seed_dashboard              # crea lo que falte
    python manage.py seed_dashboard --reset      # borra y vuelve a crear
    python manage.py seed_dashboard --months 18  # meses de historia

Usa una semilla fija, asi que dos ejecuciones producen los mismos numeros.
Son datos inventados para probar la interfaz: no representan ningun negocio real.
"""

from __future__ import annotations

import datetime as dt
import random
from decimal import Decimal, ROUND_HALF_UP

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from dashboard import models

SEMILLA = 20260917

CATEGORIAS: dict[str, list[str]] = {
    "Portatiles": ["Portatil Aurora 14", "Portatil Aurora 15 Pro", "Portatil Nimbus Air"],
    "Monitores": ["Monitor Vista 24", "Monitor Vista 27 QHD", "Monitor Vista 32 4K"],
    "Perifericos": [
        "Teclado mecanico Onda",
        "Mouse Onda Pro",
        "Diadema Onda Studio",
        "Camara web Onda 1080",
        "Base refrigerante Onda",
    ],
    "Almacenamiento": ["SSD Vortex 1 TB", "SSD Vortex 2 TB", "Disco externo Vortex 4 TB"],
    "Redes": ["Router Malla Duo", "Switch Duo 8 puertos", "Repetidor Duo"],
    "Accesorios": [
        "Morral Cordura 15",
        "Base para portatil Cordura",
        "Hub USB-C Cordura",
        "Cargador 65W Cordura",
    ],
    "Servidores": ["Servidor Atlas mini", "NAS Atlas 4 bahias"],
    "Software": ["Licencia BI anual", "Licencia ETL anual", "Soporte premium 12 meses"],
}

# Rango de precios por categoria, en pesos, para que el ticket promedio no
# quede desfasado de lo que venderia una distribuidora de tecnologia.
PRECIOS = {
    "Portatiles": (2_800_000, 7_400_000),
    "Monitores": (690_000, 3_200_000),
    "Perifericos": (58_000, 480_000),
    "Almacenamiento": (240_000, 1_400_000),
    "Redes": (180_000, 920_000),
    "Accesorios": (45_000, 320_000),
    "Servidores": (4_600_000, 13_500_000),
    "Software": (890_000, 5_900_000),
}

PAISES = [
    ("Colombia", "CO", 0.46),
    ("Mexico", "MX", 0.16),
    ("Peru", "PE", 0.11),
    ("Chile", "CL", 0.09),
    ("Ecuador", "EC", 0.07),
    ("Argentina", "AR", 0.06),
    ("Estados Unidos", "US", 0.05),
]

NOMBRES = [
    "Ana", "Camilo", "Daniela", "Esteban", "Felipe", "Gabriela", "Hector", "Isabel",
    "Javier", "Karen", "Laura", "Mauricio", "Natalia", "Oscar", "Paula", "Ricardo",
    "Sofia", "Tomas", "Valentina", "Wilson", "Ximena", "Yolanda", "Zulma", "Andres",
]
APELLIDOS = [
    "Aguirre", "Beltran", "Cardenas", "Duarte", "Escobar", "Franco", "Gomez",
    "Herrera", "Ibanez", "Jimenez", "Lozano", "Medina", "Nieto", "Ortega",
    "Pardo", "Quintero", "Rojas", "Salazar", "Torres", "Uribe", "Vargas", "Zapata",
]

MEDIOS = [
    (models.Order.PaymentMethod.CARD, 0.42),
    (models.Order.PaymentMethod.PSE, 0.22),
    (models.Order.PaymentMethod.TRANSFER, 0.16),
    (models.Order.PaymentMethod.WALLET, 0.13),
    (models.Order.PaymentMethod.CASH, 0.07),
]

ESTADOS = [
    (models.Order.Status.PAID, 0.82),
    (models.Order.Status.PENDING, 0.09),
    (models.Order.Status.REFUNDED, 0.06),
    (models.Order.Status.FAILED, 0.03),
]


def _elegir(rng: random.Random, opciones: list[tuple]) -> object:
    """Elige una opcion respetando los pesos de la ultima posicion."""
    valores = [o[0] for o in opciones]
    pesos = [o[-1] for o in opciones]
    return rng.choices(valores, weights=pesos, k=1)[0]


def _pesos_pais(rng: random.Random) -> tuple[str, str]:
    indices = list(range(len(PAISES)))
    elegido = rng.choices(indices, weights=[p[2] for p in PAISES], k=1)[0]
    pais = PAISES[elegido]
    return pais[0], pais[1]


def _dinero(valor: float) -> Decimal:
    return Decimal(valor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _sumar_meses(fecha: dt.date, meses: int) -> dt.date:
    total = fecha.year * 12 + (fecha.month - 1) + meses
    return dt.date(total // 12, total % 12 + 1, 1)


class Command(BaseCommand):
    help = "Crea datos de prueba para la pagina /dashboard."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Borra los datos del dashboard antes de sembrar.",
        )
        parser.add_argument(
            "--months", type=int, default=14, help="Meses de historia (por defecto 14)."
        )
        parser.add_argument(
            "--orders-per-month",
            type=int,
            default=130,
            help="Pedidos promedio por mes (por defecto 130).",
        )

    @transaction.atomic
    def handle(self, *args, **opciones):
        rng = random.Random(SEMILLA)
        meses = max(3, min(opciones["months"], 36))
        por_mes = max(10, min(opciones["orders_per_month"], 600))

        if opciones["reset"]:
            self.stdout.write("Borrando datos anteriores del dashboard...")
            models.OrderItem.objects.all().delete()
            models.Order.objects.all().delete()
            models.Customer.objects.all().delete()
            models.Product.objects.all().delete()
            models.MonthlyExpense.objects.all().delete()
            models.MonthlyTarget.objects.all().delete()
            models.DailyTraffic.objects.all().delete()
        elif models.Order.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    "Ya hay pedidos en la base. Usa --reset para regenerarlos."
                )
            )
            return

        tz = timezone.get_current_timezone()
        mes_final = timezone.localdate().replace(day=1)
        mes_inicial = _sumar_meses(mes_final, -(meses - 1))

        # --- Catalogo ---------------------------------------------------
        productos: list[models.Product] = []
        consecutivo = 1
        for categoria, nombres in CATEGORIAS.items():
            for nombre in nombres:
                minimo, maximo = PRECIOS.get(categoria, (60_000, 2_000_000))
                precio = _dinero(rng.uniform(minimo, maximo))
                estado = _elegir(
                    rng,
                    [
                        (models.Product.Status.ACTIVE, 0.72),
                        (models.Product.Status.LOW_STOCK, 0.19),
                        (models.Product.Status.OUT_OF_STOCK, 0.09),
                    ],
                )
                productos.append(
                    models.Product(
                        sku=f"SKU-{consecutivo:04d}",
                        name=nombre,
                        category=categoria,
                        price=precio,
                        status=estado,
                    )
                )
                consecutivo += 1
        models.Product.objects.bulk_create(productos)
        productos = list(models.Product.objects.all())

        # --- Clientes ---------------------------------------------------
        clientes: list[models.Customer] = []
        usados: set[str] = set()
        for i in range(220):
            nombre = f"{rng.choice(NOMBRES)} {rng.choice(APELLIDOS)}"
            pais, codigo = _pesos_pais(rng)
            correo = (
                nombre.lower().replace(" ", ".")
                + f"{i}@{rng.choice(['correo.com', 'empresa.co', 'mail.mx', 'buzon.pe'])}"
            )
            if correo in usados:
                continue
            usados.add(correo)
            clientes.append(
                models.Customer(name=nombre, email=correo, country=pais, country_code=codigo)
            )
        models.Customer.objects.bulk_create(clientes)
        clientes = list(models.Customer.objects.all())

        # --- Pedidos y lineas -------------------------------------------
        pedidos: list[models.Order] = []
        lineas_por_codigo: dict[str, list[tuple[models.Product, int, Decimal]]] = {}
        consecutivo = 1

        for indice_mes in range(meses):
            mes = _sumar_meses(mes_inicial, indice_mes)
            # Crecimiento sostenido con estacionalidad de fin de ano.
            factor = 1 + 0.045 * indice_mes
            if mes.month in (11, 12):
                factor *= 1.28
            if mes.month in (1, 2):
                factor *= 0.88
            cantidad = int(por_mes * factor * rng.uniform(0.92, 1.08))

            dias_mes = (_sumar_meses(mes, 1) - mes).days
            for _ in range(cantidad):
                dia = rng.randint(1, dias_mes)
                fecha = timezone.make_aware(
                    dt.datetime.combine(
                        mes.replace(day=dia),
                        dt.time(rng.randint(7, 22), rng.randint(0, 59)),
                    ),
                    tz,
                )
                if fecha.date() > timezone.localdate():
                    continue

                codigo = f"ORD-{fecha:%Y%m}-{consecutivo:05d}"
                consecutivo += 1

                lineas = []
                total = Decimal("0")
                for producto in rng.sample(productos, rng.randint(1, 3)):
                    # Lo caro se compra por unidades; lo barato, por lotes.
                    if producto.price > 2_000_000:
                        cant = rng.randint(1, 2)
                    elif producto.price > 500_000:
                        cant = rng.randint(1, 4)
                    else:
                        cant = rng.randint(1, 8)
                    # Precio con pequeno descuento ocasional.
                    unitario = _dinero(
                        float(producto.price) * rng.choice([1, 1, 1, 0.95, 0.9])
                    )
                    lineas.append((producto, cant, unitario))
                    total += unitario * cant

                pedidos.append(
                    models.Order(
                        code=codigo,
                        customer=rng.choice(clientes),
                        status=_elegir(rng, ESTADOS),
                        payment_method=_elegir(rng, MEDIOS),
                        total=_dinero(float(total)),
                        placed_at=fecha,
                    )
                )
                lineas_por_codigo[codigo] = lineas

        models.Order.objects.bulk_create(pedidos, batch_size=500)
        creados = {o.code: o.id for o in models.Order.objects.only("id", "code")}

        items = [
            models.OrderItem(
                order_id=creados[codigo],
                product=producto,
                quantity=cantidad,
                unit_price=unitario,
            )
            for codigo, lineas in lineas_por_codigo.items()
            for producto, cantidad, unitario in lineas
        ]
        models.OrderItem.objects.bulk_create(items, batch_size=1000)

        # --- Gastos, metas y trafico ------------------------------------
        gastos = []
        metas = []
        for indice_mes in range(meses):
            mes = _sumar_meses(mes_inicial, indice_mes)
            ingresos_mes = sum(
                (o.total for o in pedidos if o.placed_at.date().replace(day=1) == mes
                 and o.status == models.Order.Status.PAID),
                Decimal("0"),
            )
            # Los gastos siguen a los ingresos con una eficiencia que mejora.
            proporcion = max(0.55, 0.78 - 0.012 * indice_mes)
            gastos.append(
                models.MonthlyExpense(
                    month=mes, amount=_dinero(float(ingresos_mes) * proporcion)
                )
            )
            metas.append(
                models.MonthlyTarget(
                    month=mes,
                    revenue=_dinero(float(ingresos_mes) * rng.uniform(0.9, 1.15)),
                    orders=max(
                        1,
                        int(
                            len([o for o in pedidos
                                 if o.placed_at.date().replace(day=1) == mes
                                 and o.status == models.Order.Status.PAID])
                            * rng.uniform(0.9, 1.12)
                        ),
                    ),
                    visits=int(28_000 * (1 + 0.04 * indice_mes) * rng.uniform(0.9, 1.1)),
                )
            )
        models.MonthlyExpense.objects.bulk_create(gastos)
        models.MonthlyTarget.objects.bulk_create(metas)

        trafico = []
        dia = mes_inicial
        hoy = timezone.localdate()
        while dia <= hoy:
            base = 900 * (1 + 0.0016 * (dia - mes_inicial).days)
            # Menos trafico los domingos.
            if dia.weekday() == 6:
                base *= 0.62
            vistas = int(base * rng.uniform(0.85, 1.2))
            trafico.append(
                models.DailyTraffic(
                    date=dia,
                    page_views=vistas,
                    visitors=int(vistas * rng.uniform(0.35, 0.55)),
                )
            )
            dia += dt.timedelta(days=1)
        models.DailyTraffic.objects.bulk_create(trafico, batch_size=500)

        self.stdout.write(
            self.style.SUCCESS(
                "Datos de prueba creados: "
                f"{len(productos)} productos, {len(clientes)} clientes, "
                f"{len(pedidos)} pedidos, {len(items)} lineas, "
                f"{len(trafico)} dias de trafico "
                f"({mes_inicial:%Y-%m} a {mes_final:%Y-%m})."
            )
        )
