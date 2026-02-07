"""
API server module for Monix web interface.

This module provides REST API endpoints that expose Monix engine functionality
for use by the web UI. It maintains strict separation of concerns - all
security logic remains in engine modules, this is purely an API layer.
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse
import socket
import requests

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.analyzers.traffic import (
    is_suspicious_url,
    is_malicious_bot,
    HIGH_RISK_ENDPOINTS,
    MALICIOUS_BOT_SIGNATURES,
    classify_threat_level,
    get_traffic_summary,
    DEFAULT_LOG_PATH
)
from utils.geo import geo_lookup, reverse_dns, get_ip_info
from engine.analyzers.threat import detect_threats
from engine.scanners.security import run_security_checks
from engine.scanners.web import analyze_web_security
from engine.collectors.connection import collect_connections
from engine.monitoring.state import state
from engine.collectors.system import get_system_stats, get_top_processes
from engine.monitoring.engine import start_monitor

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

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
                        f"https://ipinfo.io/{ip_address}/json",
                        timeout=2
                    ).json()
                    loc_str = geo_response.get("loc", "")
                    if loc_str:
                        lat, lon = map(float, loc_str.split(","))
                        coordinates = {"latitude": lat, "longitude": lon}
                except:
                    pass
            except (socket.gaierror, socket.herror):
                pass
        
        # Calculate threat score
        threat_score = 0
        threats = []
        
        if suspicious:
            threat_score += 25
            threats.append("High-risk endpoint detected")
        
        # Check for suspicious patterns in path
        suspicious_patterns = [
            "..", "//", "eval", "exec", "cmd", "shell",
            ".env", ".git", ".htaccess", "passwd", "shadow"
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
            "status": "success"
        }
    except Exception as e:
        return {
            "url": url,
            "status": "error",
            "error": str(e)
        }


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
        By default, expensive checks (port scanning, metadata extraction) are disabled
        for faster responses (~5-10s vs 60s). Enable them only when needed.
    """
    data = request.get_json()
    
    if not data or "url" not in data:
        return jsonify({
            "status": "error",
            "error": "Missing 'url' in request body"
        }), 400
    
    url = data["url"]
    
    # Check for full scan parameter (query param or request body)
    full_scan = request.args.get("full", "false").lower() == "true"
    
    # Optional parameters (default to False for better performance)
    include_port_scan = data.get("include_port_scan", full_scan)
    include_metadata = data.get("include_metadata", full_scan)
    
    try:
        # Perform comprehensive web security analysis with optional checks
        result = analyze_web_security(
            url,
            include_port_scan=include_port_scan,
            include_metadata=include_metadata
        )
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


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
        return jsonify({
            "status": "error",
            "error": "Missing 'ip' in request body"
        }), 400
    
    ip = data["ip"]
    ip_info = get_ip_info(ip)
    
    return jsonify({
        "ip": ip,
        "geo_info": ip_info.get("geo", ""),
        "hostname": ip_info.get("hostname", ""),
        "status": "success"
    })


@app.route("/api/threat-info", methods=["GET"])
def threat_info():
    """
    Get information about threat detection patterns.
    
    Returns:
        JSON response with threat pattern information
    """
    return jsonify({
        "high_risk_endpoints": HIGH_RISK_ENDPOINTS[:20],  # Limit for display
        "malicious_bot_signatures": MALICIOUS_BOT_SIGNATURES[:20],
        "status": "success"
    })


@app.route("/api/connections", methods=["GET"])
def connections_endpoint():
    """
    Get current network connections.
    
    Returns:
        JSON response with list of active connections
    """
    try:
        connections = collect_connections()
        return jsonify({
            "status": "success",
            "connections": connections,
            "count": len(connections)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@app.route("/api/alerts", methods=["GET"])
def alerts_endpoint():
    """
    Get current security alerts.
    
    Returns:
        JSON response with list of security alerts
    """
    try:
        _, alerts = state.snapshot()
        return jsonify({
            "status": "success",
            "alerts": alerts,
            "count": len(alerts)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


@app.route("/api/system-stats", methods=["GET"])
def system_stats_endpoint():
    """
    Get current system statistics.
    
    Returns:
        JSON response with system resource usage statistics
    """
    try:
        stats = get_system_stats()
        return jsonify({
            "status": "success",
            **stats
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


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
        return jsonify({
            "status": "success",
            "processes": processes,
            "count": len(processes)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


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
                "log_exists": False
            }
        
        return jsonify({
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
                    {
                        "ip": ip.ip,
                        "threat_score": ip.threat_score,
                        "total_hits": ip.total_hits
                    }
                    for ip in traffic_summary.get("suspicious_ips", [])[:10]
                ]
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500


if __name__ == "__main__":
    # Run on port 3030 by default (5000 often used by AirPlay on macOS)
    port = int(os.environ.get("PORT", 3030))
    app.run(host="0.0.0.0", port=port, debug=True)
