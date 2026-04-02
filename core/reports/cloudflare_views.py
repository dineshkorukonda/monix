"""Cloudflare integration API: token storage and proxy to Cloudflare API v4."""

from __future__ import annotations

import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from . import cloudflare_client, gsc_client
from .models import UserCloudflareCredentials
from .views import _authed_user, _ensure_auth

logger = logging.getLogger(__name__)


def _decrypt_token(user) -> str | None:
    row = UserCloudflareCredentials.objects.filter(user=user).first()
    if row is None:
        return None
    try:
        return gsc_client.decrypt_refresh_token(row.api_token_encrypted)
    except Exception as exc:
        logger.warning("Could not decrypt Cloudflare token: %s", exc)
        return None


@require_GET
def api_cloudflare_status(request):
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    row = UserCloudflareCredentials.objects.filter(user=user).first()
    if row is None:
        return JsonResponse({"connected": False})
    return JsonResponse(
        {
            "connected": True,
            "account_name": row.account_name or "Cloudflare",
            "account_id": row.account_id or None,
            "zones_count": row.zones_count,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
def api_cloudflare_connect(request):
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON body."}, status=400)
    token = (data.get("api_token") or "").strip()
    if not token:
        return JsonResponse({"error": "api_token is required."}, status=400)
    user = _authed_user(request)
    try:
        summary = cloudflare_client.summarize_for_connect(token)
    except cloudflare_client.CloudflareApiError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception:
        logger.exception("Cloudflare connect failed")
        return JsonResponse({"error": "Could not verify Cloudflare token."}, status=502)

    enc = gsc_client.encrypt_refresh_token(token)
    UserCloudflareCredentials.objects.update_or_create(
        user=user,
        defaults={
            "api_token_encrypted": enc,
            "account_id": summary.account_id[:64],
            "account_name": summary.account_name[:255],
            "zones_count": summary.zones_count,
        },
    )
    return JsonResponse(
        {
            "success": True,
            "account_name": summary.account_name,
            "zones_count": summary.zones_count,
        }
    )


@csrf_exempt
@require_http_methods(["DELETE"])
def api_cloudflare_disconnect(request):
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    UserCloudflareCredentials.objects.filter(user=user).delete()
    return JsonResponse({"ok": True})


@require_GET
def api_cloudflare_zones(request):
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    user = _authed_user(request)
    token = _decrypt_token(user)
    if not token:
        return JsonResponse({"error": "Cloudflare is not connected."}, status=400)
    try:
        zones = cloudflare_client.list_zones_all(token)
        rows = cloudflare_client.zones_to_api_rows(zones)
    except cloudflare_client.CloudflareApiError as exc:
        return JsonResponse({"error": str(exc)}, status=502)
    UserCloudflareCredentials.objects.filter(user=user).update(zones_count=len(rows))
    return JsonResponse(rows, safe=False)


@require_GET
def api_cloudflare_analytics(request):
    if not _ensure_auth(request):
        return JsonResponse({"error": "Unauthorized"}, status=401)
    zone_id = (request.GET.get("zone_id") or "").strip()
    if not zone_id:
        return JsonResponse({"error": "zone_id is required."}, status=400)
    try:
        days = int(request.GET.get("days") or 7)
    except ValueError:
        return JsonResponse({"error": "Invalid days."}, status=400)
    user = _authed_user(request)
    token = _decrypt_token(user)
    if not token:
        return JsonResponse({"error": "Cloudflare is not connected."}, status=400)

    try:
        z = cloudflare_client.get_zone(token, zone_id)
    except cloudflare_client.CloudflareApiError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    zone_name = str(z.get("name") or "")
    try:
        payload = cloudflare_client.fetch_zone_analytics_dashboard(
            token, zone_id=zone_id, zone_name=zone_name, days=days
        )
    except cloudflare_client.CloudflareApiError as exc:
        logger.warning("Cloudflare analytics failed: %s", exc)
        return JsonResponse({"error": str(exc)}, status=502)
    return JsonResponse(payload)
