"""
Traffic analyzer module for Nginx access log parsing and suspicious pattern detection.

This module provides functionality to:
- Parse Nginx access logs and extract key details (IP, URL, status, user-agent, timestamp)
- Track hit frequency per IP within sliding time windows
- Detect suspicious patterns including high request rates, repeated 404 attempts,
  access to high-risk endpoints, and known malicious bot signatures

Technical Rationale:
    Web servers are common attack targets. By analyzing access logs in real-time,
    we can identify reconnaissance attempts (repeated 404s, directory traversal),
    brute force attacks (high request rates to login endpoints), and bot activity
    (known malicious user-agent signatures). This enables proactive defense before
    attacks escalate.
"""

import os
import re
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, NamedTuple


class LogEntry(NamedTuple):
    """Parsed Nginx access log entry."""
    ip: str
    timestamp: datetime
    method: str
    url: str
    status: int
    user_agent: str
    size: int


# High-risk endpoints commonly targeted by attackers
HIGH_RISK_ENDPOINTS: List[str] = [
    "/wp-login.php",
    "/wp-admin",
    "/admin",
    "/administrator",
    "/phpmyadmin",
    "/pma",
    "/myadmin",
    "/mysql",
    "/xmlrpc.php",
    "/wp-config.php",
    "/.env",
    "/.git",
    "/.git/config",
    "/.htaccess",
    "/.htpasswd",
    "/config.php",
    "/backup",
    "/shell",
    "/cmd",
    "/eval",
    "/exec",
    "/cgi-bin",
    "/scripts",
    "/.aws",
    "/.ssh",
    "/id_rsa",
    "/passwd",
    "/shadow",
    "/etc/passwd",
    "/proc/self",
    "/api/v1/pods",
    "/actuator",
    "/console",
    "/manager/html",
    "/solr/admin",
]

# Known malicious bot user-agent signatures
MALICIOUS_BOT_SIGNATURES: List[str] = [
    "sqlmap",
    "nikto",
    "nessus",
    "nmap",
    "masscan",
    "zgrab",
    "gobuster",
    "dirbuster",
    "wfuzz",
    "ffuf",
    "hydra",
    "burp",
    "acunetix",
    "netsparker",
    "appscan",
    "w3af",
    "havij",
    "python-requests",
    "go-http-client",
    "curl/",
    "wget/",
    "libwww-perl",
    "scanbot",
    "crawler",
    "spider",
    "ahrefsbot",
    "semrushbot",
    "dotbot",
    "mj12bot",
    "screaming frog",
    "heritrix",
    "censys",
    "shodan",
    "masscan",
]

# Default Nginx log path
DEFAULT_LOG_PATH: str = "/var/log/nginx/access.log"

# Combined log format regex pattern
# Format: $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
NGINX_LOG_PATTERN = re.compile(
    r'^(?P<ip>\S+)\s+'                              # IP address
    r'\S+\s+'                                        # Identity (usually -)
    r'\S+\s+'                                        # User (usually -)
    r'\[(?P<timestamp>[^\]]+)\]\s+'                 # Timestamp
    r'"(?P<method>\S+)\s+(?P<url>\S+)\s+[^"]*"\s+'  # Request
    r'(?P<status>\d+)\s+'                            # Status code
    r'(?P<size>\d+|-)\s*'                            # Response size
    r'(?:"[^"]*"\s+)?'                               # Referer (optional)
    r'"(?P<user_agent>[^"]*)"'                       # User agent
)


def parse_log_line(line: str) -> Optional[LogEntry]:
    """
    Parse a single Nginx access log line.
    
    Args:
        line: Raw log line string
        
    Returns:
        LogEntry if parsing succeeds, None otherwise
    """
    match = NGINX_LOG_PATTERN.match(line.strip())
    if not match:
        return None
    
    try:
        groups = match.groupdict()
        
        # Parse timestamp (format: 30/Dec/2025:14:23:45 +0000)
        timestamp_str = groups["timestamp"]
        timestamp = datetime.strptime(
            timestamp_str.split()[0], 
            "%d/%b/%Y:%H:%M:%S"
        )
        
        size = int(groups["size"]) if groups["size"] != "-" else 0
        
        return LogEntry(
            ip=groups["ip"],
            timestamp=timestamp,
            method=groups["method"],
            url=groups["url"],
            status=int(groups["status"]),
            user_agent=groups["user_agent"],
            size=size
        )
    except (ValueError, KeyError):
        return None


def read_recent_logs(
    log_path: str = DEFAULT_LOG_PATH,
    window_minutes: int = 10,
    max_lines: int = 50000
) -> List[LogEntry]:
    """
    Read and parse recent log entries within the time window.
    
    Args:
        log_path: Path to Nginx access log file
        window_minutes: Time window in minutes to consider
        max_lines: Maximum number of lines to read (from end of file)
        
    Returns:
        List of parsed LogEntry objects within the time window
    """
    if not os.path.exists(log_path):
        return []
    
    entries: List[LogEntry] = []
    cutoff_time = datetime.now() - timedelta(minutes=window_minutes)
    
    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            # Read last N lines efficiently
            f.seek(0, 2)  # Seek to end
            file_size = f.tell()
            
            # Estimate bytes to read (average ~200 bytes per line)
            bytes_to_read = min(file_size, max_lines * 200)
            f.seek(max(0, file_size - bytes_to_read))
            
            # Skip partial first line if we didn't start at beginning
            if f.tell() > 0:
                f.readline()
            
            for line in f:
                entry = parse_log_line(line)
                if entry and entry.timestamp >= cutoff_time:
                    entries.append(entry)
    except (IOError, PermissionError):
        return []
    
    return entries


def is_suspicious_url(url: str) -> bool:
    """
    Check if URL matches known high-risk endpoints.
    
    Args:
        url: Request URL path
        
    Returns:
        True if URL is suspicious
    """
    url_lower = url.lower()
    return any(endpoint.lower() in url_lower for endpoint in HIGH_RISK_ENDPOINTS)


def is_malicious_bot(user_agent: str) -> bool:
    """
    Check if user-agent matches known malicious bot signatures.
    
    Args:
        user_agent: User-Agent header value
        
    Returns:
        True if user-agent indicates malicious bot
    """
    ua_lower = user_agent.lower()
    return any(sig.lower() in ua_lower for sig in MALICIOUS_BOT_SIGNATURES)


class SuspiciousIP(NamedTuple):
    """Suspicious IP analysis result."""
    ip: str
    total_hits: int
    suspicious_urls: List[str]
    status_404_count: int
    malicious_bot: bool
    high_rate: bool
    threat_score: int


def analyze_traffic(
    entries: List[LogEntry],
    high_rate_threshold: int = 30,
    window_minutes: int = 10
) -> List[SuspiciousIP]:
    """
    Analyze log entries to detect suspicious traffic patterns.
    
    Detection criteria:
    - High request rate (>threshold requests in window)
    - Repeated 404 attempts (reconnaissance)
    - Access to high-risk endpoints
    - Known malicious bot user-agents
    
    Args:
        entries: List of parsed log entries
        high_rate_threshold: Request count threshold for high-rate detection
        window_minutes: Analysis time window in minutes
        
    Returns:
        List of SuspiciousIP objects sorted by threat score (descending)
    """
    # Group entries by IP
    ip_data: Dict[str, Dict] = defaultdict(lambda: {
        "hits": 0,
        "urls": [],
        "status_404": 0,
        "user_agents": set(),
        "suspicious_urls": set()
    })
    
    for entry in entries:
        data = ip_data[entry.ip]
        data["hits"] += 1
        data["urls"].append(entry.url)
        data["user_agents"].add(entry.user_agent)
        
        if entry.status == 404:
            data["status_404"] += 1
        
        if is_suspicious_url(entry.url):
            data["suspicious_urls"].add(entry.url)
    
    # Analyze each IP
    suspicious_ips: List[SuspiciousIP] = []
    
    for ip, data in ip_data.items():
        # Check for malicious bot
        malicious_bot = any(is_malicious_bot(ua) for ua in data["user_agents"])
        
        # Check for high request rate
        high_rate = data["hits"] >= high_rate_threshold
        
        # Calculate threat score
        threat_score = 0
        
        # High request rate
        if high_rate:
            threat_score += 20
        
        # Repeated 404s (reconnaissance indicator)
        if data["status_404"] >= 5:
            threat_score += 15 + min(data["status_404"], 20)
        
        # Access to high-risk endpoints
        suspicious_url_count = len(data["suspicious_urls"])
        if suspicious_url_count > 0:
            threat_score += 25 + (suspicious_url_count * 5)
        
        # Malicious bot detected
        if malicious_bot:
            threat_score += 30
        
        # Only include IPs that meet suspicious criteria
        if threat_score > 0 or high_rate:
            suspicious_ips.append(SuspiciousIP(
                ip=ip,
                total_hits=data["hits"],
                suspicious_urls=sorted(data["suspicious_urls"]),
                status_404_count=data["status_404"],
                malicious_bot=malicious_bot,
                high_rate=high_rate,
                threat_score=threat_score
            ))
    
    # Sort by threat score (descending)
    return sorted(suspicious_ips, key=lambda x: x.threat_score, reverse=True)


def get_traffic_summary(
    log_path: str = DEFAULT_LOG_PATH,
    window_minutes: int = 10,
    high_rate_threshold: int = 30
) -> Dict:
    """
    Generate a comprehensive traffic analysis summary.
    
    Args:
        log_path: Path to Nginx access log file
        window_minutes: Time window in minutes
        high_rate_threshold: Request threshold for high-rate detection
        
    Returns:
        Dictionary containing traffic analysis results
    """
    entries = read_recent_logs(log_path, window_minutes)
    suspicious_ips = analyze_traffic(entries, high_rate_threshold, window_minutes)
    
    # Calculate summary statistics
    total_requests = len(entries)
    unique_ips = len(set(e.ip for e in entries))
    total_404s = sum(1 for e in entries if e.status == 404)
    
    # Count high-risk endpoint hits
    high_risk_hits = sum(1 for e in entries if is_suspicious_url(e.url))
    
    # Count malicious bot requests
    malicious_bot_requests = sum(
        1 for e in entries if is_malicious_bot(e.user_agent)
    )
    
    return {
        "window_minutes": window_minutes,
        "total_requests": total_requests,
        "unique_ips": unique_ips,
        "total_404s": total_404s,
        "high_risk_hits": high_risk_hits,
        "malicious_bot_requests": malicious_bot_requests,
        "suspicious_ips": suspicious_ips,
        "log_path": log_path,
        "log_exists": os.path.exists(log_path)
    }


def classify_threat_level(threat_score: int) -> Tuple[str, str]:
    """
    Classify threat level based on score.
    
    Args:
        threat_score: Numeric threat score
        
    Returns:
        Tuple of (level name, color code)
    """
    if threat_score >= 50:
        return ("CRITICAL", "red")
    elif threat_score >= 30:
        return ("HIGH", "yellow")
    elif threat_score >= 15:
        return ("MEDIUM", "cyan")
    else:
        return ("LOW", "white")

