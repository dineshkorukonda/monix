"""
Monitor Command - Quick snapshot of system status
"""

import json
import socket
from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections
from cli.utils.logger import log_info, log_warn, log_success, header, divider, Colors as C
from cli.utils.geo import get_my_location


def run(output_json=False):
    """Execute the monitor command"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    hostname = socket.gethostname()
    
    log_info("Initializing connection collector...")
    
    connections = collect_connections()
    analysis = analyze_connections(connections)
    
    if output_json:
        output_data = {
            "timestamp": timestamp,
            "hostname": hostname,
            "connections": {
                "total": analysis["total"],
                "established": analysis["established"],
                "listening": analysis["listening"],
                "time_wait": analysis["time_wait"]
            },
            "alerts": analysis["alerts_count"],
            "status": "secure" if analysis["alerts_count"] == 0 else "alert",
            "top_processes": analysis["top_processes"][:5]
        }
        print(json.dumps(output_data, indent=2))
        return
    
    log_info("Threat detection engine active.")
    
    # Show alerts if any
    if analysis["alerts_count"] > 0:
        log_warn(f"Active threats detected: {analysis['alerts_count']}")
    
    # Connection summary with colors
    total = f"{C.BOLD}{C.WHITE}{analysis['total']}{C.RESET}"
    established = f"{C.GREEN}{analysis['established']}{C.RESET}"
    listening = f"{C.YELLOW}{analysis['listening']}{C.RESET}"
    
    log_info(f"Live TCP connections: {total} | Established: {established} | Listening: {listening}")
    
    # Top processes
    if analysis["top_processes"]:
        procs = ", ".join([
            f"{C.CYAN}{p[0]}{C.RESET}({C.DIM}{p[1]}{C.RESET})" 
            for p in analysis["top_processes"][:5]
        ])
        log_info(f"Top processes: {procs}")
    
    # Status
    if analysis["alerts_count"] == 0:
        log_success(f"Status: SECURE | Host: {hostname}")
    else:
        log_warn(f"Status: ALERT | Host: {hostname} | Threats: {analysis['alerts_count']}")
