"""URL configuration for the Monix Django project."""

from django.contrib import admin
from django.urls import include, path

from reports import cloudflare_views, engine_views, views as report_views

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/auth/login/", report_views.api_login, name="api_login"),
    path("api/auth/signup/", report_views.api_signup, name="api_signup"),
    path("api/auth/logout/", report_views.api_logout, name="api_logout"),
    path("api/auth/me/", report_views.api_me, name="api_me"),
    path("api/auth/profile/", report_views.api_profile, name="api_profile"),
    path("api/auth/password/", report_views.api_change_password, name="api_change_password"),
    path("api/auth/account/", report_views.api_delete_account, name="api_delete_account"),
    path(
        "api/auth/google/callback/",
        report_views.api_auth_google_callback_compat,
        name="api_auth_google_callback_compat",
    ),
    path(
        "api/auth/google/",
        report_views.api_auth_google_begin_redirect,
        name="google_auth_begin_legacy",
    ),
    path("api/auth/", include("social_django.urls")),
    path("api/targets/", report_views.api_targets, name="api_targets"),
    path("api/targets/<uuid:target_id>/", report_views.api_target_detail, name="api_target_detail"),
    path("api/scans/run/", report_views.api_run_scan, name="api_run_scan"),
    path("api/scans/", report_views.api_scans, name="api_scans"),
    path("api/scans/locations/", report_views.api_scan_locations, name="api_scan_locations"),
    path("api/reports/<uuid:report_id>/", report_views.report_detail, name="report_detail"),
    path("api/gsc/connect/", report_views.api_gsc_connect, name="api_gsc_connect"),
    path("api/gsc/callback/", report_views.api_gsc_callback, name="api_gsc_callback"),
    path("api/gsc/status/", report_views.api_gsc_status, name="api_gsc_status"),
    path("api/gsc/sites/", report_views.api_gsc_sites, name="api_gsc_sites"),
    path("api/gsc/analytics/", report_views.api_gsc_analytics, name="api_gsc_analytics"),
    path("api/gsc/disconnect/", report_views.api_gsc_disconnect, name="api_gsc_disconnect"),
    path(
        "api/gsc/sync-targets/",
        report_views.api_gsc_sync_targets,
        name="api_gsc_sync_targets",
    ),
    path("api/cloudflare/status/", cloudflare_views.api_cloudflare_status, name="api_cf_status"),
    path("api/cloudflare/connect/", cloudflare_views.api_cloudflare_connect, name="api_cf_connect"),
    path(
        "api/cloudflare/disconnect/",
        cloudflare_views.api_cloudflare_disconnect,
        name="api_cf_disconnect",
    ),
    path("api/cloudflare/zones/", cloudflare_views.api_cloudflare_zones, name="api_cf_zones"),
    path(
        "api/cloudflare/analytics/",
        cloudflare_views.api_cloudflare_analytics,
        name="api_cf_analytics",
    ),
    path("api/health/", engine_views.health, name="api_health"),
    path("api/analyze-url/", engine_views.analyze_url_view, name="api_analyze_url"),
    path("api/analyze-ip/", engine_views.analyze_ip_view, name="api_analyze_ip"),
    path("api/threat-info/", engine_views.threat_info_view, name="api_threat_info"),
    path("api/connections/", engine_views.connections_view, name="api_connections"),
    path("api/alerts/", engine_views.alerts_view, name="api_alerts"),
    path("api/system-stats/", engine_views.system_stats_view, name="api_system_stats"),
    path("api/processes/", engine_views.processes_view, name="api_processes"),
    path("api/dashboard/", engine_views.dashboard_view, name="api_dashboard"),
]
