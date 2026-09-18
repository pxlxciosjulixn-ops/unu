from django.urls import path

from resume import views

app_name = "resume"

urlpatterns = [
    path("", views.hoja_de_vida, name="detalle"),
    path("profile/", views.perfil, name="perfil"),
    # Las secciones de lista comparten vista: cambian el modelo y los limites,
    # no lo que hay que hacer con ellas.
    path("<slug:nombre>/", views.seccion, name="seccion"),
]
