import json
import logging
import secrets
import urllib.parse
from datetime import datetime

from django.conf import settings
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.core import signing
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User

from . import gsc_client, gsc_tokens
from .models import Scan, Target, UserSearchConsoleCredentials
from .scan_service import run_full_url_analysis
from .supabase_auth import authenticate_request

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _ensure_auth(request) -> bool:
    """Return True if the request is authenticated."""
    u = authenticate_request(request)
    if u is None:
        return False
    request._monix_user = u  # type: ignore[attr-defined]
    return True


def _authed_user(request) -> User:
    u = getattr(request, "_monix_user", None)
    if u is None:
        u = authenticate_request(request)
        if u is None:
            raise RuntimeError("Unauthorized")
        request._monix_user = u
    return u


def _scans_for_target(target: Target):
    """Scans linked to this target or orphan rows stored with the same URL."""
    return Scan.objects.filter(
        Q(target_id=target.id) | Q(target__isnull=True, url=target.url)
    ).order_by("-created_at")


def _user_initials(user: User) -> str:
    if user.first_name and user.last_name:
        return (user.first_name[0] + user.last_name[0]).upper()
    if user.first_name:
        return user.first_name[:2].upper()
    if user.last_name:
        return user.last_name[:2].upper()
    if user.email:
        return user.email[:2].upper()
    return user.username[:2].upper()


# ---------------------------------------------------------------------------
# Report detail (public, shareable)
# ---------------------------------------------------------------------------


@require_GET
def report_detail(request, report_id):
    """Return the full scan result for a shareable report URL."""
    try:
        scan = Scan.objects.get(report_id=report_id)
    except Scan.DoesNotExist:
        return JsonResponse({"error": "Report not found."}, status=404)

    if scan.is_expired or scan.expires_at <= timezone.now():
        return JsonResponse({"error": "Report not found."}, status=404)

    return JsonResponse(
        {
            "report_id": str(scan.report_id),
            "url": scan.url,
            "score": scan.score,
            "created_at": scan.created_at.isoformat(),
            "expires_at": scan.expires_at.isoformat(),
            "results": scan.results,
        }
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


@csrf_exempt
@require_POST
def api_login(request):
    """Deprecated: Supabase Auth handles login."""
    return JsonResponse({"error": "Use Supabase Auth for login."}, status=410)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    password = data.get("password")
    # Email-first login; accept legacy "username" key for older clients.
    email = (data.get("email") or data.get("username") or "").strip()
    if not email or not password:
        return JsonResponse({"error": "Email and password are required."}, status=400)

    if "@" in email:
        account = User.objects.filter(email__iexact=email.lower()).first()
    else:
        account = User.objects.filter(username__iexact=email).first()

    if account is None:
        return JsonResponse({"error": "Invalid credentials"}, status=401)

    user = authenticate(request, username=account.username, password=password)
    if user is not None:
        login(request, user)
        return JsonResponse({"email": user.email})
    return JsonResponse({"error": "Invalid credentials"}, status=401)


@csrf_exempt
@require_POST
def api_signup(request):
    """Deprecated: Supabase Auth handles signup."""
    return JsonResponse({"error": "Use Supabase Auth for signup."}, status=410)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    try:
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        full_name = (data.get("full_name") or "").strip()
        if not full_name:
            # Backwards compatibility with split first/last from older clients.
            fn = (data.get("first_name") or "").strip()
            ln = (data.get("last_name") or "").strip()
            full_name = f"{fn} {ln}".strip()

        if not full_name:
            return JsonResponse({"error": "Full name is required."}, status=400)
        if not email:
            return JsonResponse({"error": "Email is required."}, status=400)
        if not password or len(password) < 8:
            return JsonResponse({"error": "Password must be at least 8 characters."}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return JsonResponse({"error": "Email is already in use."}, status=400)

        parts = full_name.split()
        first_name = parts[0] if parts else ""
        last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

        # Django requires a unique username; use normalized email as the stable handle.
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        login(request, user, backend="django.contrib.auth.backends.ModelBackend")
        return JsonResponse({"email": user.email}, status=201)
    except Exception as e:
        logger.exception("signup failed")
        msg = str(e) if settings.DEBUG else "Registration could not be completed."
        return JsonResponse({"error": msg}, status=400)


@require_GET
def api_me(request):
    """Return the active logged-in user session info."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = _authed_user(request)
    display_name = f"{user.first_name} {user.last_name}".strip() or user.email or user.username
    return JsonResponse(
        {
            "email": user.email,
            "name": display_name,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "initials": _user_initials(user),
        }
    )


@csrf_exempt
@require_POST
def api_logout(request):
    """End the current Django session."""
    try:
        logout(request)
    except Exception:
        pass
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["PATCH"])
def api_profile(request):
    """Update the authenticated user's display name."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        data = json.loads(request.body)
        user = _authed_user(request)
        if "first_name" in data:
            user.first_name = data["first_name"].strip()
        if "last_name" in data:
            user.last_name = data["last_name"].strip()
        user.save(update_fields=["first_name", "last_name"])
        return JsonResponse(
            {
                "ok": True,
                "name": f"{user.first_name} {user.last_name}".strip() or user.email or user.username,
                "initials": _user_initials(user),
            }
        )
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@require_POST
def api_change_password(request):
    """Change the authenticated user's password."""
    return JsonResponse(
        {"error": "Password changes are managed by Supabase Auth."},
        status=410,
    )

    try:
        data = json.loads(request.body)
        old_password = data.get("old_password", "")
        new_password = data.get("new_password", "")

        if not new_password or len(new_password) < 8:
            return JsonResponse(
                {"error": "New password must be at least 8 characters."}, status=400
            )

        user = request.user
        if not user.check_password(old_password):
            return JsonResponse({"error": "Current password is incorrect."}, status=400)

        user.set_password(new_password)
        user.save()
        # Keep the user logged in after password change
        update_session_auth_hash(request, user)
        return JsonResponse({"ok": True})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


# ---------------------------------------------------------------------------
# Targets
# ---------------------------------------------------------------------------


@csrf_exempt
def api_targets(request):
    """List or create monitored targets for the authenticated user."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = _authed_user(request)

    if request.method == "GET":
        targets = Target.objects.filter(owner=user)
        data = []
        for t in targets:
            scans_qs = _scans_for_target(t)
            latest_scan = scans_qs.first()
            data.append(
                {
                    "id": str(t.id),
                    "name": t.url.replace("https://", "").replace("http://", "").split("/")[0],
                    "url": t.url,
                    "environment": t.environment,
                    "ip": None,
                    "location": None,
                    "activity": (
                        f"{len((latest_scan.results or {}).get('findings', []))} findings"
                        if latest_scan
                        else None
                    ),
                    "status": (
                        "Healthy"
                        if latest_scan and latest_scan.score > 80
                        else ("Warning" if latest_scan else "Not scanned")
                    ),
                    "lastScan": (
                        latest_scan.created_at.strftime("%B %d, %H:%M") if latest_scan else None
                    ),
                    "score": latest_scan.score if latest_scan else None,
                    "created_at": t.created_at.isoformat(),
                    "scan_count": scans_qs.count(),
                    "gsc_property_url": t.gsc_property_url or None,
                    "gsc_analytics": t.gsc_analytics,
                    "gsc_synced_at": (
                        t.gsc_synced_at.isoformat() if t.gsc_synced_at else None
                    ),
                    "gsc_sync_error": t.gsc_sync_error or None,
                }
            )
        return JsonResponse(data, safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            url = data.get("url", "").strip()
            if not url:
                return JsonResponse({"error": "url is required"}, status=400)
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            environment = (data.get("environment") or "").strip()
            target = Target.objects.create(owner=user, url=url, environment=environment)
            try:
                gsc_tokens.sync_target_search_console(target)
            except Exception as exc:
                logger.warning("GSC sync after target create failed: %s", exc)
            target.refresh_from_db()
            return JsonResponse(
                {
                    "id": str(target.id),
                    "url": target.url,
                    "name": target.url.replace("https://", "").replace("http://", "").split("/")[0],
                    "environment": target.environment,
                    "gsc_property_url": target.gsc_property_url or None,
                    "gsc_analytics": target.gsc_analytics,
                    "gsc_synced_at": (
                        target.gsc_synced_at.isoformat() if target.gsc_synced_at else None
                    ),
                    "gsc_sync_error": target.gsc_sync_error or None,
                },
                status=201,
            )
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method Not Allowed"}, status=405)


@csrf_exempt
def api_target_detail(request, target_id):
    """Retrieve or delete a single monitored target."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        user = _authed_user(request)
        target = Target.objects.get(id=target_id, owner=user)
    except Target.DoesNotExist:
        return JsonResponse({"error": "Target not found."}, status=404)

    if request.method == "GET":
        scans_qs = _scans_for_target(target)
        latest_scan = scans_qs.first()
        return JsonResponse(
            {
                "id": str(target.id),
                "name": target.url.replace("https://", "").replace("http://", "").split("/")[0],
                "url": target.url,
                "environment": target.environment,
                "status": (
                    "Healthy"
                    if latest_scan and latest_scan.score > 80
                    else ("Warning" if latest_scan else "Not scanned")
                ),
                "lastScan": (
                    latest_scan.created_at.strftime("%B %d, %H:%M") if latest_scan else None
                ),
                "score": latest_scan.score if latest_scan else None,
                "latest_report_id": (
                    str(latest_scan.report_id) if latest_scan else None
                ),
                "created_at": target.created_at.isoformat(),
                "scan_count": scans_qs.count(),
                "gsc_property_url": target.gsc_property_url or None,
                "gsc_analytics": target.gsc_analytics,
                "gsc_synced_at": (
                    target.gsc_synced_at.isoformat() if target.gsc_synced_at else None
                ),
                "gsc_sync_error": target.gsc_sync_error or None,
            }
        )

    if request.method == "DELETE":
        target.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method Not Allowed"}, status=405)


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------


@csrf_exempt
@require_POST
def api_run_scan(request):
    """
    Run a full URL analysis on behalf of the logged-in user.

    Optional ``target_id`` is validated against the caller's targets before the
    scan is linked.
    """
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    if "url" not in data or not str(data.get("url", "")).strip():
        return JsonResponse({"error": "Missing 'url' in request body"}, status=400)

    url = str(data["url"]).strip()
    target_id = data.get("target_id")
    tid_str = None
    if target_id is not None and str(target_id).strip():
        tid = str(target_id).strip()
        if not Target.objects.filter(id=tid, owner=user).exists():
            return JsonResponse({"error": "Target not found."}, status=404)
        tid_str = tid

    full_scan = request.GET.get("full", "false").lower() == "true"
    include_port_scan = data.get("include_port_scan", full_scan)
    include_metadata = data.get("include_metadata", full_scan)
    include_performance = bool(data.get("include_performance", False))
    if full_scan:
        include_performance = True

    try:
        result = run_full_url_analysis(
            url,
            full_scan=full_scan,
            include_port_scan=include_port_scan,
            include_metadata=include_metadata,
            include_performance=include_performance,
            target_id=tid_str,
            persist=True,
        )
        return JsonResponse(result)
    except Exception as exc:
        logger.exception("api_run_scan failed: %s", exc)
        return JsonResponse({"status": "error", "error": str(exc)}, status=500)


@require_GET
def api_scans(request):
    """Return scans for the user's targets, including orphan rows tied by URL match."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = _authed_user(request)
    targets = Target.objects.filter(owner=user)
    target_ids = list(targets.values_list("id", flat=True))
    owned_urls = list(targets.values_list("url", flat=True))
    scans = (
        Scan.objects.filter(
            Q(target_id__in=target_ids)
            | Q(target__isnull=True, url__in=owned_urls)
        )
        .select_related("target")
        .distinct()
        .order_by("-created_at")[:100]
    )

    data = []
    for s in scans:
        data.append(
            {
                "id": str(s.report_id),
                "report_id": str(s.report_id),
                "url": s.url,
                "score": s.score,
                "created_at": s.created_at.isoformat(),
                "target_id": str(s.target.id) if s.target else None,
                "target_name": (
                    s.target.url.replace("https://", "").replace("http://", "").split("/")[0]
                    if s.target
                    else s.url.replace("https://", "").replace("http://", "").split("/")[0]
                ),
            }
        )
    return JsonResponse(data, safe=False)


@require_GET
def api_scan_locations(request):
    """Return server location coordinates for all scans belonging to this user."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = _authed_user(request)
    targets = Target.objects.filter(owner=user)
    target_ids = list(targets.values_list("id", flat=True))
    owned_urls = list(targets.values_list("url", flat=True))
    scans = (
        Scan.objects.filter(
            Q(target_id__in=target_ids)
            | Q(target__isnull=True, url__in=owned_urls)
        )
        .distinct()
        .order_by("-created_at")[:200]
    )

    data = []
    seen = set()
    for s in scans:
        loc = (s.results or {}).get("server_location") or {}
        coords = loc.get("coordinates") or {}
        lat = coords.get("latitude")
        lng = coords.get("longitude")
        if lat is None or lng is None:
            continue
        key = (round(lat, 2), round(lng, 2))
        if key in seen:
            continue
        seen.add(key)
        data.append({
            "url": s.url,
            "lat": lat,
            "lng": lng,
            "city": loc.get("city") or "",
            "country": loc.get("country") or "",
            "org": loc.get("org") or "",
            "score": s.score,
        })
    return JsonResponse(data, safe=False)


# ---------------------------------------------------------------------------
# Google Search Console
# ---------------------------------------------------------------------------


@require_GET
def api_gsc_connect(request):
    """Start OAuth: return JSON with Google authorization URL (stateless signed ``state``)."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    payload = {"u": user.username, "n": secrets.token_urlsafe(16)}
    state = signing.dumps(payload, salt="gsc-oauth-state")
    try:
        authorization_url = gsc_client.build_authorization_url(state)
    except RuntimeError as exc:
        return JsonResponse({"error": str(exc)}, status=503)
    return JsonResponse({"authorization_url": authorization_url})


@require_GET
def api_gsc_callback(request):
    """OAuth redirect handler: exchange code, store tokens, redirect to the frontend."""
    err = request.GET.get("error")
    err_base = settings.GSC_OAUTH_ERROR_URL
    if err:
        return redirect(f"{err_base}&reason={urllib.parse.quote(err)}")
    code = request.GET.get("code")
    state = request.GET.get("state")
    if not code or not state:
        return redirect(f"{err_base}&reason=invalid_callback")
    try:
        decoded = signing.loads(state, salt="gsc-oauth-state", max_age=15 * 60)
        username = str((decoded or {}).get("u") or "")
        user = User.objects.get(username=username)
    except Exception:
        return redirect(f"{err_base}&reason=invalid_callback")

    try:
        bundle = gsc_client.exchange_code_for_tokens(code)
        gsc_tokens.save_tokens_from_oauth(
            user,
            access_token=bundle.access_token,
            refresh_token=bundle.refresh_token,
            expires_in=bundle.expires_in,
        )
    except ValueError as exc:
        logger.warning("GSC OAuth token save failed: %s", exc)
        return redirect(f"{err_base}&reason=no_refresh_token")
    except Exception:
        logger.exception("GSC OAuth callback failed")
        return redirect(f"{err_base}&reason=token_exchange")

    return redirect(settings.GSC_OAUTH_SUCCESS_URL)


@require_GET
def api_auth_google_callback_compat(request):
    """
    Support legacy Authorized redirect URI ``/api/auth/google/callback/``.

    Search Console OAuth often used this path via ``GOOGLE_REDIRECT_URI``; the scope
    includes ``webmasters``. Sign-in with Google uses the same host without that scope
    and is delegated to python-social-auth's ``complete`` view.
    """
    scope = (request.GET.get("scope") or "").lower()
    if "webmasters" in scope:
        return api_gsc_callback(request)

    from social_django.views import complete as social_complete_view

    return social_complete_view(request, backend="google-oauth2")


@require_GET
def api_auth_google_begin_redirect(request):
    """Redirect old ``/api/auth/google/`` start URL to the standard social-auth path."""
    return redirect("/api/auth/login/google-oauth2/")


@require_GET
def api_gsc_status(request):
    """Whether the user has connected Search Console (refresh token on file)."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    connected = gsc_tokens.get_credentials_row(user) is not None
    return JsonResponse({"connected": connected})


@require_GET
def api_gsc_sites(request):
    """List Search Console properties (``/webmasters/v3/sites``)."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    token = gsc_tokens.get_valid_access_token(user)
    if not token:
        return JsonResponse(
            {"error": "Google Search Console is not connected."},
            status=400,
        )
    try:
        sites = gsc_client.list_sites(token)
    except Exception as exc:
        logger.warning("api_gsc_sites failed: %s", exc)
        return JsonResponse({"error": "Failed to list Search Console sites."}, status=502)
    return JsonResponse({"sites": sites})


@csrf_exempt
@require_POST
def api_gsc_analytics(request):
    """
    POST JSON: ``site_url`` (required), optional ``start_date``, ``end_date`` (ISO ``YYYY-MM-DD``).

    Returns Search Analytics totals and top queries for the property.
    """
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    site_url = (data.get("site_url") or "").strip()
    if not site_url:
        return JsonResponse({"error": "site_url is required."}, status=400)

    user = _authed_user(request)
    token = gsc_tokens.get_valid_access_token(user)
    if not token:
        return JsonResponse(
            {"error": "Google Search Console is not connected."},
            status=400,
        )

    start = None
    end = None
    if data.get("start_date"):
        try:
            start = datetime.fromisoformat(str(data["start_date"])).date()
        except ValueError:
            return JsonResponse({"error": "Invalid start_date."}, status=400)
    if data.get("end_date"):
        try:
            end = datetime.fromisoformat(str(data["end_date"])).date()
        except ValueError:
            return JsonResponse({"error": "Invalid end_date."}, status=400)

    try:
        sites = gsc_client.list_sites(token)
        allowed = {s.get("siteUrl", "") for s in sites}
        if site_url not in allowed:
            return JsonResponse(
                {"error": "site_url is not in your verified Search Console properties."},
                status=403,
            )
        payload = gsc_client.fetch_gsc_bundle_for_site(
            site_url, token, start=start, end=end
        )
    except Exception as exc:
        logger.warning("api_gsc_analytics failed: %s", exc)
        return JsonResponse({"error": "Failed to fetch Search Analytics."}, status=502)
    return JsonResponse(payload)


@csrf_exempt
@require_POST
def api_gsc_disconnect(request):
    """Remove stored Search Console tokens for the current user."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    UserSearchConsoleCredentials.objects.filter(user=user).delete()
    return JsonResponse({"ok": True})


@csrf_exempt
@require_POST
def api_gsc_sync_targets(request):
    """
    Re-run Search Console property matching and analytics fetch for every target.

    Use after connecting GSC or when projects were added before tokens existed.
    """
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    if not gsc_tokens.get_credentials_row(user):
        return JsonResponse(
            {"error": "Google Search Console is not connected."},
            status=400,
        )
    targets = list(
        Target.objects.filter(owner=user).order_by("-created_at"),
    )
    errors = 0
    for target in targets:
        try:
            gsc_tokens.sync_target_search_console(target)
        except Exception as exc:
            errors += 1
            logger.warning("api_gsc_sync_targets failed for %s: %s", target.id, exc)
    return JsonResponse(
        {
            "ok": True,
            "targets": len(targets),
            "errors": errors,
        }
    )


@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_account(request):
    """Permanently delete the authenticated user's account and all associated data."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = _authed_user(request)
    # Django CASCADE deletion handles removing all targets, scans, and reports.
    user.delete()
    logout(request)
    return JsonResponse({"ok": True})


