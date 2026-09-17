from django.urls import path

from core import views

app_name = "core"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("chat/", views.chat, name="chat"),
]
