import json
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST, require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.models import User

from .models import Report, Scan, Target


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ensure_auth(request) -> bool:
    """Return True if the request is authenticated."""
    return request.user.is_authenticated


def _user_initials(user: User) -> str:
    if user.first_name and user.last_name:
        return (user.first_name[0] + user.last_name[0]).upper()
    return user.username[:2].upper()


# ---------------------------------------------------------------------------
# Report detail (public, shareable)
# ---------------------------------------------------------------------------

@require_GET
def report_detail(request, report_id):
    """Return the full scan result for a shareable report URL."""
    try:
        scan = Scan.objects.select_related("report").get(report_id=report_id)
    except Scan.DoesNotExist:
        return JsonResponse({"error": "Report not found."}, status=404)

    try:
        report = scan.report
    except Report.DoesNotExist:
        return JsonResponse({"error": "Report not found."}, status=404)

    if report.is_expired or report.expires_at <= timezone.now():
        return JsonResponse({"error": "Report not found."}, status=404)

    return JsonResponse(
        {
            "report_id": str(scan.report_id),
            "url": scan.url,
            "score": scan.score,
            "created_at": scan.created_at.isoformat(),
            "expires_at": report.expires_at.isoformat(),
            "results": scan.results,
        }
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@csrf_exempt
@require_POST
def api_login(request):
    """Authenticate and store session login."""
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"username": user.username, "email": user.email})
        return JsonResponse({"error": "Invalid credentials"}, status=401)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_GET
def api_me(request):
    """Return the active logged-in user session info."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized. Please run createsuperuser."}, status=401)

    user = request.user
    return JsonResponse({
        "username": user.username,
        "name": f"{user.first_name} {user.last_name}".strip() or user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "initials": _user_initials(user),
    })


@csrf_exempt
@require_POST
def api_logout(request):
    """End the current Django session."""
    logout(request)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["PATCH"])
def api_profile(request):
    """Update the authenticated user's display name."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        data = json.loads(request.body)
        user = request.user
        if "first_name" in data:
            user.first_name = data["first_name"].strip()
        if "last_name" in data:
            user.last_name = data["last_name"].strip()
        user.save(update_fields=["first_name", "last_name"])
        return JsonResponse({
            "ok": True,
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "initials": _user_initials(user),
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@csrf_exempt
@require_POST
def api_change_password(request):
    """Change the authenticated user's password."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        data = json.loads(request.body)
        old_password = data.get("old_password", "")
        new_password = data.get("new_password", "")

        if not new_password or len(new_password) < 8:
            return JsonResponse({"error": "New password must be at least 8 characters."}, status=400)

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

    if request.method == "GET":
        targets = Target.objects.filter(owner=request.user)
        data = []
        for t in targets:
            latest_scan = t.scans.order_by("-created_at").first()
            data.append({
                "id": str(t.id),
                "name": t.url.replace("https://", "").replace("http://", "").split("/")[0],
                "url": t.url,
                "environment": t.environment,
                "ip": "Analyzing Target",
                "location": t.environment,
                "activity": (
                    latest_scan.results.get("threat", "Awaiting initial scan telemetry")
                    if latest_scan
                    else "No scans active on this target yet"
                ),
                "status": "Healthy" if not latest_scan or latest_scan.score > 80 else "Warning",
                "lastScan": latest_scan.created_at.strftime("%B %d, %H:%M") if latest_scan else "Never",
                "score": latest_scan.score if latest_scan else 100,
                "created_at": t.created_at.isoformat(),
                "scan_count": t.scans.count(),
            })
        return JsonResponse(data, safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            url = data.get("url", "").strip()
            if not url:
                return JsonResponse({"error": "url is required"}, status=400)
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            environment = data.get("environment", "Production")
            target = Target.objects.create(owner=request.user, url=url, environment=environment)
            return JsonResponse({
                "id": str(target.id),
                "url": target.url,
                "name": target.url.replace("https://", "").replace("http://", "").split("/")[0],
                "environment": target.environment,
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method Not Allowed"}, status=405)


@csrf_exempt
def api_target_detail(request, target_id):
    """Retrieve or delete a single monitored target."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    try:
        target = Target.objects.get(id=target_id, owner=request.user)
    except Target.DoesNotExist:
        return JsonResponse({"error": "Target not found."}, status=404)

    if request.method == "GET":
        latest_scan = target.scans.order_by("-created_at").first()
        return JsonResponse({
            "id": str(target.id),
            "name": target.url.replace("https://", "").replace("http://", "").split("/")[0],
            "url": target.url,
            "environment": target.environment,
            "status": "Healthy" if not latest_scan or latest_scan.score > 80 else "Warning",
            "lastScan": latest_scan.created_at.strftime("%B %d, %H:%M") if latest_scan else "Never",
            "score": latest_scan.score if latest_scan else 100,
            "created_at": target.created_at.isoformat(),
            "scan_count": target.scans.count(),
        })

    if request.method == "DELETE":
        target.delete()
        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Method Not Allowed"}, status=405)


# ---------------------------------------------------------------------------
# Scans
# ---------------------------------------------------------------------------

@require_GET
def api_scans(request):
    """Return all scans belonging to the authenticated user's targets."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    target_ids = Target.objects.filter(owner=request.user).values_list("id", flat=True)
    scans = (
        Scan.objects
        .filter(target__id__in=target_ids)
        .select_related("target")
        .order_by("-created_at")[:100]
    )

    data = []
    for s in scans:
        data.append({
            "id": str(s.report_id),
            "report_id": str(s.report_id),
            "url": s.url,
            "score": s.score,
            "created_at": s.created_at.isoformat(),
            "target_id": str(s.target.id) if s.target else None,
            "target_name": (
                s.target.url.replace("https://", "").replace("http://", "").split("/")[0]
                if s.target else s.url.replace("https://", "").replace("http://", "").split("/")[0]
            ),
        })
    return JsonResponse(data, safe=False)
@csrf_exempt
@require_http_methods(["DELETE"])
def api_delete_account(request):
    """Permanently delete the authenticated user's account and all associated data."""
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    user = request.user
    # Django CASCADE deletion handles removing all targets, scans, and reports.
    user.delete()
    logout(request)
    return JsonResponse({"ok": True})
