import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.collectors.connection import collect_connections
from engine.analyzers.threat import detect_threats
from utils.logger import log_info, log_warn, Colors as C

def run(limit=10):
    connections = collect_connections()
    threats = detect_threats(connections)
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if not threats:
        log_info("No security alerts detected")
        return
    
    print()
    print(f"{C.DIM}[{timestamp}]{C.RESET} {C.BOLD}{C.RED}Security Alerts{C.RESET} {C.DIM}({len(threats)} detected){C.RESET}")
    print(f"{C.DIM}{'─' * 70}{C.RESET}")
    
    for threat in threats[:limit]:
        if "SYN_FLOOD" in threat:
            alert_type = f"{C.RED}SYN_FLOOD{C.RESET}"
        elif "PORT_SCAN" in threat:
            alert_type = f"{C.YELLOW}PORT_SCAN{C.RESET}"
        elif "HIGH_CONN" in threat:
            alert_type = f"{C.YELLOW}HIGH_CONN{C.RESET}"
        else:
            alert_type = f"{C.WHITE}ALERT{C.RESET}"
        
        ts = f"{C.DIM}[{timestamp}]{C.RESET}"
        print(f"{ts} {C.YELLOW}WARN:{C.RESET} [{alert_type}] {threat}")
    
    print(f"{C.DIM}{'─' * 70}{C.RESET}")
    print()
