from django.urls import path

from finanzas import views

app_name = "finanzas"

urlpatterns = [
    path("movimientos/", views.movimientos, name="movimientos"),
]
