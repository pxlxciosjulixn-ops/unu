from django.urls import path

from descargas import views

app_name = "descargas"

urlpatterns = [
    path("info/", views.info, name="info"),
    path("trabajos/", views.crear_trabajo, name="crear-trabajo"),
    path("trabajos/<str:id_trabajo>/", views.estado_trabajo, name="estado-trabajo"),
    path(
        "trabajos/<str:id_trabajo>/archivo/",
        views.archivo_trabajo,
        name="archivo-trabajo",
    ),
]
