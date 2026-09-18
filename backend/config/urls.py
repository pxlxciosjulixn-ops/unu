from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("core.urls")),
    path("api/chat/", include("chat.urls")),
    path("api/dashboard/", include("dashboard.urls")),
    path("api/resume/", include("resume.urls")),
]
