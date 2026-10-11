from django.urls import path

from ubicacion import views

app_name = "ubicacion"

urlpatterns = [
    path("config/", views.config, name="config"),
    path("registrar/", views.registrar, name="registrar"),
    path("registros/", views.registros, name="registros"),
]
