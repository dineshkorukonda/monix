"""
Status Command - One-line health check
"""

import socket
from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections
from cli.utils.logger import Colors as C


def run():
    """Execute the status command - prints a single line status"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hostname = socket.gethostname()
    
    connections = collect_connections()
    analysis = analyze_connections(connections)
    
    ts = f"{C.DIM}[{timestamp}]{C.RESET}"
    
    if analysis["alerts_count"] == 0:
        status = f"{C.BOLD}{C.GREEN}SECURE{C.RESET}"
    else:
        status = f"{C.BOLD}{C.RED}ALERT{C.RESET}"
    
    host = f"{C.CYAN}{hostname}{C.RESET}"
    conn = f"{C.WHITE}{analysis['total']}{C.RESET}"
    est = f"{C.GREEN}{analysis['established']}{C.RESET}"
    listen = f"{C.YELLOW}{analysis['listening']}{C.RESET}"
    alerts = f"{C.RED}{analysis['alerts_count']}{C.RESET}" if analysis['alerts_count'] > 0 else f"{C.DIM}0{C.RESET}"
    
    print(f"{ts} {status} | {host} | conn:{conn} established:{est} listen:{listen} alerts:{alerts}")
