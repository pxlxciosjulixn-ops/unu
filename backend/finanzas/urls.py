from django.urls import path

from finanzas import views

app_name = "finanzas"

urlpatterns = [
    path("movimientos/", views.movimientos, name="movimientos"),
    path("movimientos/<int:pk>/", views.movimiento, name="movimiento"),
    path("sugerencias/", views.sugerencias, name="sugerencias"),
    path("sugerencias/<int:pk>/", views.sugerencia, name="sugerencia"),
]
