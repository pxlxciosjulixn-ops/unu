from django.urls import path

from core import auth_views, views

app_name = "core"

urlpatterns = [
    path("health/", views.health, name="health"),
    # Autenticacion con JWT.
    path("auth/login/", auth_views.LoginView.as_view(), name="login"),
    path("auth/refresh/", auth_views.RefreshView.as_view(), name="refresh"),
    path("auth/logout/", auth_views.logout, name="logout"),
    path("auth/me/", auth_views.me, name="me"),
]
