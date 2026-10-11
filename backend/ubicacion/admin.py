from django.contrib import admin

from ubicacion.models import ConfigUbicacion, RegistroUbicacion


@admin.register(RegistroUbicacion)
class RegistroUbicacionAdmin(admin.ModelAdmin):
    list_display = ["created_at", "ip", "ciudad", "region", "pais", "tiene_gps"]
    list_filter = ["pais", "region", "created_at"]
    search_fields = ["ip", "ciudad", "region"]
    readonly_fields = [f.name for f in RegistroUbicacion._meta.fields]

    def has_add_permission(self, request) -> bool:
        # Los registros los crea quien acepta en la página, no se agregan a mano.
        return False


@admin.register(ConfigUbicacion)
class ConfigUbicacionAdmin(admin.ModelAdmin):
    list_display = ["__str__"]

    def has_add_permission(self, request) -> bool:
        # Una sola fila de textos.
        return not ConfigUbicacion.objects.exists()

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
