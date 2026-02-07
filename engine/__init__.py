"""
Core modules for Monix.

This package provides the main functionality for intrusion monitoring and defense:
- collectors: Data collection (connections, system stats)
- analyzers: Analysis and threat detection
- scanners: Security scanning
- monitoring: Monitoring engine and state management
"""

# Maintain backward compatibility by re-exporting from new locations
from engine.collectors.connection import collect_connections
from engine.analyzers.threat import analyze_connections, detect_threats
from engine.scanners.security import run_security_checks
from engine.monitoring.engine import start_monitor
from engine.monitoring.state import state

# Also export commonly used functions from other modules
from engine.collectors.system import (
    get_system_stats,
    get_top_processes,
    get_disk_io,
    format_uptime,
    format_bytes
)
from engine.analyzers.traffic import (
    get_traffic_summary,
    DEFAULT_LOG_PATH
)
from engine.scanners.web import analyze_web_security

__all__ = [
    'collect_connections',
    'analyze_connections',
    'detect_threats',
    'run_security_checks',
    'start_monitor',
    'state',
    'get_system_stats',
    'get_top_processes',
    'get_disk_io',
    'format_uptime',
    'format_bytes',
    'get_traffic_summary',
    'DEFAULT_LOG_PATH',
    'analyze_web_security'
]
