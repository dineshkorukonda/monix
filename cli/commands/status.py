import os
import socket
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.collectors.connection import collect_connections
from engine.analyzers.threat import analyze_connections
from utils.logger import Colors as C

def run():
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
