"""
API server module for Monix web interface.

This module provides REST API endpoints that expose Monix core functionality
for use by the web UI. It maintains strict separation of concerns - all
security logic remains in core modules, this is purely an API layer.
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

from core.traffic import (
    is_suspicious_url,
    is_malicious_bot,
    HIGH_RISK_ENDPOINTS,
    MALICIOUS_BOT_SIGNATURES,
    classify_threat_level
)
from shared.geo import geo_lookup, reverse_dns, get_ip_info
from core.analyzer import detect_threats
from core.scanner import run_security_checks
from core.web_checker import analyze_web_security

app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend


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
    Perform comprehensive web security analysis.
    
    Request body:
        {
            "url": "https://example.com"
        }
    
    Returns:
        JSON response with complete security analysis including:
        - SSL certificate information
        - DNS records
        - HTTP headers
        - Security.txt check
        - Server location
        - Threat analysis
    """
    data = request.get_json()
    
    if not data or "url" not in data:
        return jsonify({
            "status": "error",
            "error": "Missing 'url' in request body"
        }), 400
    
    url = data["url"]
    
    # Ensure URL has scheme
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    
    try:
        # Perform comprehensive web security analysis
        analysis = analyze_web_security(url)
        
        # Add threat analysis using Monix core
        parsed = urlparse(url)
        path = parsed.path or "/"
        suspicious = is_suspicious_url(path)
        
        threat_score = 0
        threats = []
        
        if suspicious:
            threat_score += 25
            threats.append("High-risk endpoint detected")
        
        # Check for suspicious patterns
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
        
        # Check security headers
        security_headers = analysis.get("http_headers", {}).get("security_headers", {})
        missing_security_headers = []
        for header in ["strict-transport-security", "x-frame-options", "content-security-policy"]:
            if not security_headers.get(header):
                missing_security_headers.append(header)
                threat_score += 5
        
        if missing_security_headers:
            threats.append(f"Missing security headers: {', '.join(missing_security_headers)}")
        
        # Check SSL
        ssl_info = analysis.get("ssl_certificate", {})
        if not ssl_info.get("valid") and ssl_info.get("error") != "Not HTTPS":
            threat_score += 30
            threats.append("SSL certificate issue detected")
        
        # Classify threat level
        level_name, level_color = classify_threat_level(threat_score)
        
        # Combine all results
        result = {
            "status": "success",
            "url": url,
            "domain": analysis.get("domain", ""),
            "ip_address": analysis.get("ip_address"),
            "threat_score": threat_score,
            "threat_level": level_name,
            "threat_color": level_color,
            "threats": threats,
            "ssl_certificate": ssl_info,
            "dns_records": analysis.get("dns_records", {}),
            "http_headers": analysis.get("http_headers", {}),
            "security_headers_analysis": analysis.get("security_headers_analysis", {}),
            "security_txt": analysis.get("security_txt", {}),
            "server_location": analysis.get("server_location", {}),
            "port_scan": analysis.get("port_scan", {}),
            "technologies": analysis.get("technologies", {}),
            "cookies": analysis.get("cookies", {}),
            "redirects": analysis.get("redirects", {}),
            "metadata": analysis.get("metadata", {}),
        }
        
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


if __name__ == "__main__":
    # Run on port 3030 by default (5000 often used by AirPlay on macOS)
    port = int(os.environ.get("PORT", 3030))
    app.run(host="0.0.0.0", port=port, debug=True)

