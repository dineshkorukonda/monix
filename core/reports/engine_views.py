"""JSON API views migrated from the former Flask ``api.server`` (scan engine)."""

from __future__ import annotations

import json
import logging
from functools import wraps

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from scan_engine.collectors.connection import collect_connections
from scan_engine.collectors.system import get_system_stats, get_top_processes
from scan_engine.monitoring.state import state

from .scan_service import (
    analyze_ip,
    dashboard_payload,
    run_full_url_analysis,
    threat_info,
)
from .supabase_auth import authenticate_request

logger = logging.getLogger(__name__)


def _json_error(message: str, status: int = 400) -> JsonResponse:
    return JsonResponse({"status": "error", "error": message}, status=status)


def _require_engine_auth(view_fn):
    """Reject unauthenticated requests when REQUIRE_ENGINE_AUTH is True."""

    @wraps(view_fn)
    def wrapper(request, *args, **kwargs):
        if not getattr(settings, "REQUIRE_ENGINE_AUTH", True):
            return view_fn(request, *args, **kwargs)
        if getattr(request, "user", None) is not None and request.user.is_authenticated:
            return view_fn(request, *args, **kwargs)
        if authenticate_request(request) is not None:
            return view_fn(request, *args, **kwargs)
        return JsonResponse({"status": "error", "error": "Unauthorized"}, status=401)

    return wrapper


@require_GET
def health(request):
    return JsonResponse({"status": "ok", "service": "monix-api"})


@csrf_exempt
@require_http_methods(["POST"])
@_require_engine_auth
def analyze_url_view(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return _json_error("Invalid JSON body", 400)

    if not data or "url" not in data:
        return _json_error("Missing 'url' in request body", 400)

    url = str(data["url"]).strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    full_scan = request.GET.get("full", "false").lower() == "true"
    include_port_scan = data.get("include_port_scan", full_scan)
    include_metadata = data.get("include_metadata", full_scan)
    include_performance = bool(data.get("include_performance", False))
    if full_scan:
        include_performance = True

    # Public callers cannot attach scans to another user's target.
    target_id = data.get("target_id")
    if target_id:
        target_id = None

    try:
        result = run_full_url_analysis(
            url,
            full_scan=full_scan,
            include_port_scan=include_port_scan,
            include_metadata=include_metadata,
            include_performance=include_performance,
            target_id=target_id,
            persist=True,
        )
        return JsonResponse(result)
    except Exception as e:
        logger.exception("analyze_url_view")
        return _json_error(str(e), 500)


@csrf_exempt
@require_http_methods(["POST"])
@_require_engine_auth
def analyze_ip_view(request):
    try:
        data = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return _json_error("Invalid JSON body", 400)

    if not data or "ip" not in data:
        return _json_error("Missing 'ip' in request body", 400)

    return JsonResponse(analyze_ip(data["ip"]))


@require_GET
@_require_engine_auth
def threat_info_view(request):
    return JsonResponse(threat_info())


@require_GET
@_require_engine_auth
def connections_view(request):
    try:
        connections = collect_connections()
        return JsonResponse(
            {"status": "success", "connections": connections, "count": len(connections)}
        )
    except Exception as e:
        return _json_error(str(e), 500)


@require_GET
@_require_engine_auth
def alerts_view(request):
    try:
        _, alerts = state.snapshot()
        return JsonResponse({"status": "success", "alerts": alerts, "count": len(alerts)})
    except Exception as e:
        return _json_error(str(e), 500)


@require_GET
@_require_engine_auth
def system_stats_view(request):
    try:
        stats = get_system_stats()
        return JsonResponse({"status": "success", **stats})
    except Exception as e:
        return _json_error(str(e), 500)


@require_GET
@_require_engine_auth
def processes_view(request):
    try:
        limit = int(request.GET.get("limit", 10))
        processes = get_top_processes(limit=limit)
        return JsonResponse(
            {"status": "success", "processes": processes, "count": len(processes)}
        )
    except Exception as e:
        return _json_error(str(e), 500)


@require_GET
@_require_engine_auth
def dashboard_view(request):
    try:
        return JsonResponse(
            dashboard_payload(
                collect_connections_fn=collect_connections,
                state_snapshot_fn=state.snapshot,
                get_system_stats_fn=get_system_stats,
            )
        )
    except Exception as e:
        return _json_error(str(e), 500)
