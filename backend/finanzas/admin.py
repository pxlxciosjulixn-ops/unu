"""Corregir o borrar un movimiento mal anotado se hace desde el admin."""

from django.contrib import admin

from finanzas import models


@admin.register(models.Movimiento)
class MovimientoAdmin(admin.ModelAdmin):
    list_display = ["fecha", "tipo", "concepto", "valor", "created_at"]
    list_filter = ["tipo", "fecha"]
    search_fields = ["concepto"]
    date_hierarchy = "fecha"


@admin.register(models.Sugerencia)
class SugerenciaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "created_at"]
    search_fields = ["nombre"]


@admin.register(models.AvisoEnviado)
class AvisoEnviadoAdmin(admin.ModelAdmin):
    list_display = ["tipo", "mes", "enviado_at"]
    list_filter = ["tipo"]


@admin.register(models.AjusteVisual)
class AjusteVisualAdmin(admin.ModelAdmin):
    list_display = ["visitante", "datos", "updated_at"]
    readonly_fields = ["visitante", "updated_at"]


@admin.register(models.Credito)
class CreditoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "saldo_inicial", "fecha_inicio", "cupo", "cuota"]


@admin.register(models.CargoCredito)
class CargoCreditoAdmin(admin.ModelAdmin):
    list_display = ["credito", "fecha", "tipo", "valor", "nota"]
    list_filter = ["tipo", "credito"]


@admin.register(models.GastoFijo)
class GastoFijoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "monto", "dia_pago", "fecha_inicio", "fecha_fin"]


@admin.register(models.ConfiguracionFinanzas)
class ConfiguracionFinanzasAdmin(admin.ModelAdmin):
    list_display = ["salario", "updated_at"]
