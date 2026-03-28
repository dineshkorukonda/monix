"""
API server module for Monix web interface.

This module provides REST API endpoints that expose Monix core functionality
for use by the web UI. It maintains strict separation of concerns - all
security logic remains in core modules, this is purely an API layer.
"""

import os
import sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests
import socket
from flask import Flask, request, jsonify
from flask_cors import CORS

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CORE_DIR = os.path.join(_REPO_ROOT, "core")
for _p in (_REPO_ROOT, _CORE_DIR):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Header Django (or other trusted callers) send when linking a scan to a Target UUID.
_INTERNAL_SCAN_SECRET_HEADER = "X-Monix-Internal-Scan-Secret"

from api.analyzers.traffic import (  # noqa: E402
    is_suspicious_url,
    HIGH_RISK_ENDPOINTS,
    MALICIOUS_BOT_SIGNATURES,
    classify_threat_level,
    get_traffic_summary,
    DEFAULT_LOG_PATH,
)
from utils.geo import get_ip_info  # noqa: E402
from api.scanners.web import analyze_web_security  # noqa: E402
from api.collectors.connection import collect_connections  # noqa: E402
from api.monitoring.state import state  # noqa: E402
from api.collectors.system import get_system_stats, get_top_processes  # noqa: E402
from api.monitoring.engine import start_monitor  # noqa: E402
from api.db import save_scan  # noqa: E402
from api.seo_checker import run_seo_checks  # noqa: E402
from api.performance_checker import run_performance_checks  # noqa: E402
from api.scoring import calculate_overall_score  # noqa: E402
from reports.scan_proxy import resolve_internal_scan_secret  # noqa: E402


def _internal_scan_secret_ok() -> bool:
    """True when the request carries the configured internal scan secret."""
    expected = resolve_internal_scan_secret()
    if not expected:
        return False
    return request.headers.get(_INTERNAL_SCAN_SECRET_HEADER, "") == expected

app = Flask(__name__)
# Enable CORS for Next.js frontend
frontend_url = os.environ.get("FRONTEND_URL", "*")
CORS(app, origins=[frontend_url] if frontend_url != "*" else "*")

# Start background monitoring when API server starts
# This ensures state is continuously updated
try:
    start_monitor()
except Exception:
    pass  # Monitor may already be running


def analyze_url(url: str) -> dict:
    """
    Analyze a URL for security threats.

    This function checks:
    - If URL path matches high-risk endpoints
    - If URL structure indicates suspicious patterns
    - Domain/IP information and geolocation

    Args:
        url: URL string to analyze

    Returns:
        Dictionary containing analysis results
    """
    try:
        parsed = urlparse(url)
        path = parsed.path or "/"
        domain = parsed.netloc.split(":")[0] if parsed.netloc else ""

        # Check if path is suspicious
        suspicious = is_suspicious_url(path)

        # Get IP from domain if possible
        ip_address = None
        geo_info = ""
        hostname = ""
        coordinates = None

        if domain:
            try:
                ip_address = socket.gethostbyname(domain)
                ip_info = get_ip_info(ip_address)
                geo_info = ip_info.get("geo", "")
                hostname = ip_info.get("hostname", "")

                # Get coordinates from ipinfo.io
                try:
                    geo_response = requests.get(
                        f"https://ipinfo.io/{ip_address}/json", timeout=2
                    ).json()
                    loc_str = geo_response.get("loc", "")
                    if loc_str:
                        lat, lon = map(float, loc_str.split(","))
                        coordinates = {"latitude": lat, "longitude": lon}
                except Exception:
                    pass
            except (socket.gaierror, socket.herror, OSError):
                pass

        # Calculate threat score
        threat_score = 0
        threats = []

        if suspicious:
            threat_score += 25
            threats.append("High-risk endpoint detected")

        # Check for suspicious patterns in path
        suspicious_patterns = [
            "..",
            "//",
            "eval",
            "exec",
            "cmd",
            "shell",
            ".env",
            ".git",
            ".htaccess",
            "passwd",
            "shadow",
        ]

        path_lower = path.lower()
        for pattern in suspicious_patterns:
            if pattern in path_lower:
                threat_score += 10
                threats.append(f"Suspicious pattern in path: {pattern}")
                break

        # Classify threat level
        level_name, level_color = classify_threat_level(threat_score)

        return {
            "url": url,
            "domain": domain,
            "path": path,
            "ip_address": ip_address,
            "geo_info": geo_info,
            "hostname": hostname,
            "coordinates": coordinates,
            "suspicious": suspicious,
            "threat_score": threat_score,
            "threat_level": level_name,
            "threat_color": level_color,
            "threats": threats,
            "status": "success",
        }
    except Exception as e:
        return {"url": url, "status": "error", "error": str(e)}


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "monix-api"})


@app.route("/api/analyze-url", methods=["POST"])
def analyze_url_endpoint():
    """
    Perform comprehensive web security analysis with optional checks.

    Request body:
        {
            "url": "https://example.com",
            "include_port_scan": false,  // optional, default: false
            "include_metadata": false    // optional, default: false
        }

    Query params (alternative):
        ?full=true  // Enables all checks including port scan and metadata

    Returns:
        JSON response with complete security analysis

    Performance Note:
        Port scan and metadata default off. PageSpeed (Lighthouse) defaults off
        (``include_performance: false``); enable in the JSON body or use ``?full=true``
        for a deep scan. SEO + security checks still run on every request.
    """
    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"status": "error", "error": "Missing 'url' in request body"}), 400

    url = data["url"].strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    # Check for full scan parameter (query param or request body)
    full_scan = request.args.get("full", "false").lower() == "true"

    # Optional parameters (default to False for better performance)
    include_port_scan = data.get("include_port_scan", full_scan)
    include_metadata = data.get("include_metadata", full_scan)
    # Google PageSpeed (mobile + desktop) — omit by default to save ~30–60s.
    include_performance = bool(data.get("include_performance", False))
    if full_scan:
        include_performance = True

    try:
        # Perform comprehensive web security analysis with optional checks
        result = analyze_web_security(
            url, include_port_scan=include_port_scan, include_metadata=include_metadata
        )

        seo_result: dict
        performance_result: dict

        if include_performance:
            # SEO + PageSpeed are independent; run concurrently.
            with ThreadPoolExecutor(max_workers=2) as pool:
                f_seo = pool.submit(run_seo_checks, url)
                f_perf = pool.submit(run_performance_checks, url)
                try:
                    seo_result = f_seo.result()
                except Exception as exc:
                    seo_result = {
                        "checks": {},
                        "seo_score": 0,
                        "error": str(exc),
                    }
                try:
                    performance_result = f_perf.result()
                except Exception as exc:
                    performance_result = {
                        "mobile": {"error": str(exc)},
                        "desktop": {"error": str(exc)},
                    }
        else:
            try:
                seo_result = run_seo_checks(url)
            except Exception as exc:
                seo_result = {
                    "checks": {},
                    "seo_score": 0,
                    "error": str(exc),
                }
            performance_result = {
                "mobile": {
                    "performance_score": None,
                    "error": "skipped_fast_scan",
                },
                "desktop": {
                    "performance_score": None,
                    "error": "skipped_fast_scan",
                },
            }

        result["seo"] = seo_result
        result["performance"] = performance_result
        result["lighthouse_ran"] = include_performance

        # Calculate composite score from all three categories.
        # ``result`` is the security scan output from analyze_web_security;
        # the seo/performance keys merged into it are ignored by
        # calculate_security_score, which reads only security-specific keys.
        scores = calculate_overall_score(
            result,
            seo_result,
            performance_result,
            include_performance=include_performance,
        )
        result["scores"] = scores

        # Persist scan result to the shared PostgreSQL database so Django can
        # retrieve it for report management and admin.
        # target_id is only honored from trusted callers (Django proxy) so clients
        # cannot attach scans to another user's Target.
        target_id = data.get("target_id")
        if target_id and not _internal_scan_secret_ok():
            target_id = None
        report_id = save_scan(url=url, score=scores["overall"], results=result, target_id=target_id)
        if report_id:
            result["report_id"] = report_id
            result["report_url"] = f"/dashboard/report/{report_id}"

        return jsonify(result)

    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/analyze-ip", methods=["POST"])
def analyze_ip_endpoint():
    """
    Analyze an IP address for security information.

    Request body:
        {
            "ip": "192.168.1.1"
        }

    Returns:
        JSON response with IP analysis results
    """
    data = request.get_json()

    if not data or "ip" not in data:
        return jsonify({"status": "error", "error": "Missing 'ip' in request body"}), 400

    ip = data["ip"]
    ip_info = get_ip_info(ip)

    return jsonify(
        {
            "ip": ip,
            "geo_info": ip_info.get("geo", ""),
            "hostname": ip_info.get("hostname", ""),
            "status": "success",
        }
    )


@app.route("/api/threat-info", methods=["GET"])
def threat_info():
    """
    Get information about threat detection patterns.

    Returns:
        JSON response with threat pattern information
    """
    return jsonify(
        {
            "high_risk_endpoints": HIGH_RISK_ENDPOINTS[:20],  # Limit for display
            "malicious_bot_signatures": MALICIOUS_BOT_SIGNATURES[:20],
            "status": "success",
        }
    )


@app.route("/api/connections", methods=["GET"])
def connections_endpoint():
    """
    Get current network connections.

    Returns:
        JSON response with list of active connections
    """
    try:
        connections = collect_connections()
        return jsonify({"status": "success", "connections": connections, "count": len(connections)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/alerts", methods=["GET"])
def alerts_endpoint():
    """
    Get current security alerts.

    Returns:
        JSON response with list of security alerts
    """
    try:
        _, alerts = state.snapshot()
        return jsonify({"status": "success", "alerts": alerts, "count": len(alerts)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/system-stats", methods=["GET"])
def system_stats_endpoint():
    """
    Get current system statistics.

    Returns:
        JSON response with system resource usage statistics
    """
    try:
        stats = get_system_stats()
        return jsonify({"status": "success", **stats})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/processes", methods=["GET"])
def processes_endpoint():
    """
    Get top processes by CPU usage.

    Query params:
        limit: Maximum number of processes to return (default: 10)

    Returns:
        JSON response with top processes
    """
    try:
        limit = request.args.get("limit", 10, type=int)
        processes = get_top_processes(limit=limit)
        return jsonify({"status": "success", "processes": processes, "count": len(processes)})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


@app.route("/api/dashboard", methods=["GET"])
def dashboard_endpoint():
    """
    Get comprehensive dashboard data.

    Returns:
        JSON response with all dashboard data including:
        - connections
        - alerts
        - system_stats
        - traffic_summary
    """
    try:
        # Get connections
        connections = collect_connections()

        # Get alerts
        _, alerts = state.snapshot()

        # Get system stats
        system_stats = get_system_stats()

        # Get traffic summary
        try:
            traffic_summary = get_traffic_summary(DEFAULT_LOG_PATH, window_minutes=10)
        except Exception:
            traffic_summary = {
                "total_requests": 0,
                "unique_ips": 0,
                "total_404s": 0,
                "high_risk_hits": 0,
                "suspicious_ips": [],
                "log_exists": False,
            }

        return jsonify(
            {
                "status": "success",
                "connections": connections,
                "alerts": alerts,
                "system_stats": system_stats,
                "traffic_summary": {
                    "total_requests": traffic_summary.get("total_requests", 0),
                    "unique_ips": traffic_summary.get("unique_ips", 0),
                    "total_404s": traffic_summary.get("total_404s", 0),
                    "high_risk_hits": traffic_summary.get("high_risk_hits", 0),
                    "suspicious_ips": [
                        {"ip": ip.ip, "threat_score": ip.threat_score, "total_hits": ip.total_hits}
                        for ip in traffic_summary.get("suspicious_ips", [])[:10]
                    ],
                },
            }
        )
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 500


if __name__ == "__main__":
    # Run on port 3030 by default (5000 often used by AirPlay on macOS)
    port = int(os.environ.get("PORT", 3030))
    app.run(host="0.0.0.0", port=port, debug=True)
