"""
Alerts Command - Show recent security alerts
"""

from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import detect_threats
from cli.utils.logger import log_info, log_warn


def run(limit=10):
    """Execute the alerts command"""
    
    connections = collect_connections()
    threats = detect_threats(connections)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not threats:
        log_info("No security alerts detected")
        return
    
    print()
    print(f"[{timestamp}] Security Alerts ({len(threats)} detected)")
    print("-" * 70)
    
    for threat in threats[:limit]:
        # Determine alert type
        if "SYN_FLOOD" in threat:
            alert_type = "SYN_FLOOD"
        elif "PORT_SCAN" in threat:
            alert_type = "PORT_SCAN"
        elif "HIGH_CONN" in threat:
            alert_type = "HIGH_CONN"
        else:
            alert_type = "ALERT"
        
        print(f"[{timestamp}] WARN: [{alert_type}] {threat}")
    
    print("-" * 70)
    print()
