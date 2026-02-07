"""
Analysis and threat detection modules for Monix.

This package contains modules responsible for analyzing collected data:
- threat: Connection analysis and threat detection (SYN floods, port scans, etc.)
- traffic: Web traffic log analysis and suspicious pattern detection
"""

from engine.analyzers.threat import analyze_connections, detect_threats
from engine.analyzers.traffic import (
    LogEntry,
    SuspiciousIP,
    parse_log_line,
    read_recent_logs,
    is_suspicious_url,
    is_malicious_bot,
    analyze_traffic,
    get_traffic_summary,
    classify_threat_level,
    DEFAULT_LOG_PATH,
    HIGH_RISK_ENDPOINTS,
    MALICIOUS_BOT_SIGNATURES
)

__all__ = [
    'analyze_connections',
    'detect_threats',
    'LogEntry',
    'SuspiciousIP',
    'parse_log_line',
    'read_recent_logs',
    'is_suspicious_url',
    'is_malicious_bot',
    'analyze_traffic',
    'get_traffic_summary',
    'classify_threat_level',
    'DEFAULT_LOG_PATH',
    'HIGH_RISK_ENDPOINTS',
    'MALICIOUS_BOT_SIGNATURES'
]
