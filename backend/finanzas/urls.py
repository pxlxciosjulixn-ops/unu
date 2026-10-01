from django.urls import path

from finanzas import views

app_name = "finanzas"

urlpatterns = [
    path("movimientos/", views.movimientos, name="movimientos"),
    path("movimientos/<int:pk>/", views.movimiento, name="movimiento"),
    path("sugerencias/", views.sugerencias, name="sugerencias"),
    path("sugerencias/<int:pk>/", views.sugerencia, name="sugerencia"),
    path("creditos/", views.creditos, name="creditos"),
    path("creditos/<int:pk>/", views.credito, name="credito"),
    path("creditos/<int:pk>/cargos/", views.cargos, name="cargos"),
    path("cargos/<int:pk>/", views.cargo, name="cargo"),
    path("gastos-fijos/", views.gastos_fijos, name="gastos_fijos"),
    path("gastos-fijos/<int:pk>/", views.gasto_fijo, name="gasto_fijo"),
    path("configuracion/", views.configuracion, name="configuracion"),
    path("ajustes/", views.ajustes, name="ajustes"),
    path("exportar/", views.exportar, name="exportar"),
]
