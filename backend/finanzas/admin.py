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
