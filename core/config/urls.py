"""URL configuration for the Monix Django project."""

from django.contrib import admin
from django.urls import include, path

from reports import views as report_views

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
    # Legacy paths (must be before social_django include). GSC OAuth may still use
    # /api/auth/google/callback/ as GOOGLE_REDIRECT_URI in .env / Google Cloud.
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
    # Google OAuth2 (python-social-auth): namespace "social" for @psa. Start:
    # GET /api/auth/login/google-oauth2/ — redirect_uri is /api/auth/google/callback/
    # (see MonixDjangoStrategy + api_auth_google_callback_compat).
    path("api/auth/", include("social_django.urls")),
    # Targets
    path("api/targets/", report_views.api_targets, name="api_targets"),
    path("api/targets/<uuid:target_id>/", report_views.api_target_detail, name="api_target_detail"),
    # Scans
    path("api/scans/run/", report_views.api_run_scan, name="api_run_scan"),
    path("api/scans/", report_views.api_scans, name="api_scans"),
    path("api/scans/locations/", report_views.api_scan_locations, name="api_scan_locations"),
    # Reports (public/shareable)
    path("api/reports/<uuid:report_id>/", report_views.report_detail, name="report_detail"),
    # Google Search Console (OAuth + API; tokens stored server-side)
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
    # Catch-all: proxy any remaining /api/* requests to the Flask service so
    # both apps can share a single Render service with one public URL.
    path("api/<path:path>", report_views.flask_proxy, name="flask_proxy"),
]
