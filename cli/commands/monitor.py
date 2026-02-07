import json
import os
import socket
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.collectors.connection import collect_connections
from engine.analyzers.threat import analyze_connections
from utils.logger import log_info, log_warn, log_success, Colors as C
from utils.geo import get_my_location

def run(output_json=False):
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
    
    if analysis["alerts_count"] > 0:
        log_warn(f"Active threats detected: {analysis['alerts_count']}")
    
    total = f"{C.BOLD}{C.WHITE}{analysis['total']}{C.RESET}"
    established = f"{C.GREEN}{analysis['established']}{C.RESET}"
    listening = f"{C.YELLOW}{analysis['listening']}{C.RESET}"
    
    log_info(f"Live TCP connections: {total} | Established: {established} | Listening: {listening}")
    
    if analysis["top_processes"]:
        procs = ", ".join([
            f"{C.CYAN}{p[0]}{C.RESET}({C.DIM}{p[1]}{C.RESET})" 
            for p in analysis["top_processes"][:5]
        ])
        log_info(f"Top processes: {procs}")
    
    if analysis["alerts_count"] == 0:
        log_success(f"Status: SECURE | Host: {hostname}")
    else:
        log_warn(f"Status: ALERT | Host: {hostname} | Threats: {analysis['alerts_count']}")
