"""Placeholder Cloudflare integration API (token storage not implemented yet)."""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods


@require_GET
def api_cloudflare_status(request):
    return JsonResponse({"connected": False})


@csrf_exempt
@require_http_methods(["POST"])
def api_cloudflare_connect(request):
    return JsonResponse(
        {
            "error": "Cloudflare integration is not configured on this server.",
        },
        status=400,
    )


@csrf_exempt
@require_http_methods(["DELETE"])
def api_cloudflare_disconnect(request):
    return JsonResponse({"ok": True})


@require_GET
def api_cloudflare_zones(request):
    return JsonResponse([], safe=False)


@require_GET
def api_cloudflare_analytics(request):
    zone_id = request.GET.get("zone_id") or ""
    days = int(request.GET.get("days") or 7)
    return JsonResponse(
        {
            "zone_id": zone_id,
            "zone_name": "",
            "period_days": days,
            "totals": {
                "requests": 0,
                "cached_requests": 0,
                "bandwidth_bytes": 0,
                "threats": 0,
                "pageviews": 0,
                "uniques": 0,
            },
            "series": [],
            "top_countries": [],
            "status_codes": [],
        }
    )
