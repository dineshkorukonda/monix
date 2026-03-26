"""URL configuration for the Monix Django project."""

from django.contrib import admin
from django.urls import path

from reports import views as report_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/login/", report_views.api_login, name="api_login"),
    path("api/auth/me/", report_views.api_me, name="api_me"),
    path("api/targets/", report_views.api_targets, name="api_targets"),
    path("api/reports/<uuid:report_id>/", report_views.report_detail, name="report_detail"),
]
