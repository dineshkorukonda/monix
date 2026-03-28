"""URL configuration for the Monix Django project."""

from django.contrib import admin
from django.urls import path

from reports import views as report_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/login/", report_views.api_login, name="api_login"),
    path("api/auth/logout/", report_views.api_logout, name="api_logout"),
    path("api/auth/me/", report_views.api_me, name="api_me"),
    path("api/auth/profile/", report_views.api_profile, name="api_profile"),
    path("api/auth/password/", report_views.api_change_password, name="api_change_password"),
    path("api/auth/account/", report_views.api_delete_account, name="api_delete_account"),
    # Targets
    path("api/targets/", report_views.api_targets, name="api_targets"),
    path("api/targets/<uuid:target_id>/", report_views.api_target_detail, name="api_target_detail"),
    # Scans
    path("api/scans/", report_views.api_scans, name="api_scans"),
    # Reports (public/shareable)
    path("api/reports/<uuid:report_id>/", report_views.report_detail, name="report_detail"),
]
