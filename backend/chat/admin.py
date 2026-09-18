from django.contrib import admin

from chat.models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ("role", "content", "created_at")
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("title", "visitor_corto", "updated_at", "total_mensajes")
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
