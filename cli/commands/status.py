"""
Status Command - One-line health check
"""

import socket
from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections


def run():
    """Execute the status command - prints a single line status"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hostname = socket.gethostname()
    
    connections = collect_connections()
    analysis = analyze_connections(connections)
    
    status = "SECURE" if analysis["alerts_count"] == 0 else "ALERT"
    
    print(f"[{timestamp}] {status} | {hostname} | conn:{analysis['total']} established:{analysis['established']} listen:{analysis['listening']} alerts:{analysis['alerts_count']}")
