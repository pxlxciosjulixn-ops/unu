from django.urls import path

from chat import views

app_name = "chat"

urlpatterns = [
    path("", views.send, name="send"),
    path("conversations/", views.conversations, name="conversations"),
    path("conversations/clear/", views.conversations_clear, name="conversations-clear"),
    path(
        "conversations/<uuid:conversation_id>/",
        views.conversation_detail,
        name="conversation-detail",
    ),
]
