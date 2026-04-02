"""
URL analysis and dashboard aggregation (formerly ``api.server`` Flask handlers).
"""

from __future__ import annotations

import socket
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from urllib.parse import urlparse

import requests

from scan_engine.analyzers.traffic import (
    DEFAULT_LOG_PATH,
    HIGH_RISK_ENDPOINTS,
    MALICIOUS_BOT_SIGNATURES,
    classify_threat_level,
    get_traffic_summary,
    is_suspicious_url,
)
from scan_engine.collectors.connection import collect_connections
from scan_engine.collectors.system import get_system_stats, get_top_processes
from scan_engine.monitoring.engine import start_monitor
from scan_engine.monitoring.state import state
from scan_engine.performance_checker import run_performance_checks
from scan_engine.scanners.web import analyze_web_security
from scan_engine.seo_checker import run_seo_checks
from scan_engine.scoring import calculate_overall_score
from scan_engine.utils.geo import get_ip_info

from .persistence import save_scan_result


def analyze_url(url: str) -> dict[str, Any]:
    """
    Lightweight URL threat heuristics (path, DNS, geo) — used by ``/api/analyze-url`` style flows.
    """
    try:
        parsed = urlparse(url)
        path = parsed.path or "/"
        domain = parsed.netloc.split(":")[0] if parsed.netloc else ""

        suspicious = is_suspicious_url(path)

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

        threat_score = 0
        threats = []

        if suspicious:
            threat_score += 25
            threats.append("High-risk endpoint detected")

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


def run_full_url_analysis(
    url: str,
    *,
    full_scan: bool = False,
    include_port_scan: bool | None = None,
    include_metadata: bool | None = None,
    include_performance: bool = False,
    target_id: str | None = None,
    persist: bool = True,
) -> dict[str, Any]:
    """
    Full security + SEO + optional PageSpeed analysis. Optionally persists via ``save_scan_result``.
    """
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    if include_port_scan is None:
        include_port_scan = full_scan
    if include_metadata is None:
        include_metadata = full_scan
    if full_scan:
        include_performance = True

    result = analyze_web_security(
        url, include_port_scan=include_port_scan, include_metadata=include_metadata
    )

    if include_performance:
        with ThreadPoolExecutor(max_workers=2) as pool:
            f_seo = pool.submit(run_seo_checks, url)
            f_perf = pool.submit(run_performance_checks, url)
            try:
                seo_result = f_seo.result()
            except Exception as exc:
                seo_result = {"checks": {}, "seo_score": 0, "error": str(exc)}
            try:
                performance_result = f_perf.result()
            except Exception as exc:
                performance_result = {"mobile": {"error": str(exc)}, "desktop": {"error": str(exc)}}
    else:
        try:
            seo_result = run_seo_checks(url)
        except Exception as exc:
            seo_result = {"checks": {}, "seo_score": 0, "error": str(exc)}
        performance_result = {
            "mobile": {"performance_score": None, "error": "skipped_fast_scan"},
            "desktop": {"performance_score": None, "error": "skipped_fast_scan"},
        }

    result["seo"] = seo_result
    result["performance"] = performance_result
    result["lighthouse_ran"] = include_performance

    scores = calculate_overall_score(
        result,
        seo_result,
        performance_result,
        include_performance=include_performance,
    )
    result["scores"] = scores

    if persist:
        report_id = save_scan_result(
            url=url, score=scores["overall"], results=result, target_id=target_id
        )
        if report_id:
            result["report_id"] = report_id
            result["report_url"] = f"/dashboard/report/{report_id}"

    return result


def analyze_ip(ip: str) -> dict[str, Any]:
    ip_info = get_ip_info(ip)
    return {
        "ip": ip,
        "geo_info": ip_info.get("geo", ""),
        "hostname": ip_info.get("hostname", ""),
        "status": "success",
    }


def threat_info() -> dict[str, Any]:
    return {
        "high_risk_endpoints": HIGH_RISK_ENDPOINTS[:20],
        "malicious_bot_signatures": MALICIOUS_BOT_SIGNATURES[:20],
        "status": "success",
    }


def dashboard_payload() -> dict[str, Any]:
    connections = collect_connections()
    _, alerts = state.snapshot()
    system_stats = get_system_stats()
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

    return {
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


__all__ = [
    "analyze_url",
    "analyze_ip",
    "dashboard_payload",
    "run_full_url_analysis",
    "threat_info",
]
