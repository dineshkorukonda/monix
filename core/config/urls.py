"""URL configuration for the Monix Django project."""

from django.contrib import admin
from django.urls import path

from reports import views as report_views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/reports/<uuid:report_id>/", report_views.report_detail, name="report_detail"),
]
