from django.contrib import admin

from chat.models import (
    AjustesConsejero,
    AnalisisConversacion,
    Conversation,
    Message,
    PreferenciaVisitante,
    Valoracion,
)


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("role", "content", "created_at")
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("title", "scope", "visitor_corto", "updated_at", "total_mensajes", "borrada_en", "eliminada_en")
    # Lo que el visitante "borro" sigue aqui; este filtro lo separa.
    list_filter = ("scope", ("borrada_en", admin.EmptyFieldListFilter))
    search_fields = ("title", "messages__content")
    date_hierarchy = "updated_at"
    inlines = [MessageInline]

    @admin.display(description="visitante")
    def visitor_corto(self, obj: Conversation) -> str:
        # El hash completo no aporta nada de un vistazo.
        return obj.visitor[:12]

    @admin.display(description="mensajes")
    def total_mensajes(self, obj: Conversation) -> int:
        return obj.messages.count()


@admin.register(AnalisisConversacion)
class AnalisisConversacionAdmin(admin.ModelAdmin):
    list_display = (
        "nombre", "visitor_corto", "total_mensajes", "desde", "hasta", "created_at", "borrado_en", "eliminado_en"
    )
    list_filter = (("borrado_en", admin.EmptyFieldListFilter),)
    search_fields = ("nombre", "contenido")
    readonly_fields = ("visitor", "created_at")

    @admin.display(description="visitante")
    def visitor_corto(self, obj: AnalisisConversacion) -> str:
        return obj.visitor[:12]


@admin.register(PreferenciaVisitante)
class PreferenciaVisitanteAdmin(admin.ModelAdmin):
    list_display = ("visitor", "groseria", "personalidad", "sin_limite", "updated_at")
    list_filter = ("groseria", "personalidad", "sin_limite")


@admin.register(AjustesConsejero)
class AjustesConsejeroAdmin(admin.ModelAdmin):
    list_display = ("max_caracteres", "updated_at")


@admin.register(Valoracion)
class ValoracionAdmin(admin.ModelAdmin):
    list_display = ("util", "personalidad", "groseria", "visitor", "updated_at")
    list_filter = ("util", "personalidad", "groseria")
    readonly_fields = ("mensaje", "visitor", "created_at", "updated_at")
