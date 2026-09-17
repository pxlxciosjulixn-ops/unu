"""
Modelo de datos del dashboard: catalogo, clientes, pedidos, gastos, metas y
trafico. Es un modelo de ventas sencillo pero suficiente para alimentar los
indicadores, las series de tiempo y las tablas de la pagina /dashboard.
"""

from django.db import models


class Product(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Disponible"
        LOW_STOCK = "low_stock", "Pocas unidades"
        OUT_OF_STOCK = "out_of_stock", "Agotado"

    sku = models.CharField("SKU", max_length=32, unique=True)
    name = models.CharField("nombre", max_length=160)
    category = models.CharField("categoria", max_length=80)
    price = models.DecimalField("precio", max_digits=12, decimal_places=2)
    status = models.CharField(
        "estado", max_length=16, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "producto"
        verbose_name_plural = "productos"
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.sku} · {self.name}"


class Customer(models.Model):
    name = models.CharField("nombre", max_length=160)
    email = models.EmailField("correo", unique=True)
    country = models.CharField("pais", max_length=80)
    country_code = models.CharField("codigo ISO", max_length=2)
    created_at = models.DateTimeField("creado", auto_now_add=True)

    class Meta:
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["name"]
        indexes = [models.Index(fields=["country_code"])]

    def __str__(self) -> str:
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        PAID = "paid", "Pagado"
        PENDING = "pending", "Pendiente"
        REFUNDED = "refunded", "Devuelto"
        FAILED = "failed", "Fallido"

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Tarjeta de credito"
        PSE = "pse", "PSE"
        TRANSFER = "transfer", "Transferencia"
        CASH = "cash", "Efectivo"
        WALLET = "wallet", "Billetera digital"

    code = models.CharField("codigo", max_length=24, unique=True)
    customer = models.ForeignKey(
        Customer, verbose_name="cliente", on_delete=models.CASCADE, related_name="orders"
    )
    status = models.CharField(
        "estado", max_length=16, choices=Status.choices, default=Status.PAID
    )
    payment_method = models.CharField(
        "medio de pago", max_length=16, choices=PaymentMethod.choices
    )
    total = models.DecimalField("total", max_digits=14, decimal_places=2)
    placed_at = models.DateTimeField("fecha")

    class Meta:
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"
        ordering = ["-placed_at"]
        indexes = [
            models.Index(fields=["-placed_at"]),
            models.Index(fields=["status", "-placed_at"]),
        ]

    def __str__(self) -> str:
        return self.code


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, verbose_name="pedido", on_delete=models.CASCADE, related_name="items"
    )
    product = models.ForeignKey(
        Product, verbose_name="producto", on_delete=models.PROTECT, related_name="items"
    )
    quantity = models.PositiveIntegerField("cantidad")
    unit_price = models.DecimalField("precio unitario", max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = "linea de pedido"
        verbose_name_plural = "lineas de pedido"

    def __str__(self) -> str:
        return f"{self.order_id} · {self.product_id} x{self.quantity}"


class MonthlyExpense(models.Model):
    """Gastos del mes, para poder calcular la utilidad sin inventarla."""

    month = models.DateField("mes", unique=True, help_text="Primer dia del mes")
    amount = models.DecimalField("monto", max_digits=14, decimal_places=2)

    class Meta:
        verbose_name = "gasto mensual"
        verbose_name_plural = "gastos mensuales"
        ordering = ["-month"]

    def __str__(self) -> str:
        return f"{self.month:%Y-%m}: {self.amount}"


class MonthlyTarget(models.Model):
    """Metas del mes: son la base de los anillos de porcentaje del dashboard."""

    month = models.DateField("mes", unique=True, help_text="Primer dia del mes")
    revenue = models.DecimalField("meta de ingresos", max_digits=14, decimal_places=2)
    orders = models.PositiveIntegerField("meta de pedidos")
    visits = models.PositiveIntegerField("meta de visitas")

    class Meta:
        verbose_name = "meta mensual"
        verbose_name_plural = "metas mensuales"
        ordering = ["-month"]

    def __str__(self) -> str:
        return f"{self.month:%Y-%m}"


class DailyTraffic(models.Model):
    date = models.DateField("fecha", unique=True)
    page_views = models.PositiveIntegerField("paginas vistas")
    visitors = models.PositiveIntegerField("visitantes")

    class Meta:
        verbose_name = "trafico diario"
        verbose_name_plural = "trafico diario"
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.date}: {self.page_views}"
