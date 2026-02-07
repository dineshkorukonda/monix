import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.collectors.connection import collect_connections
from engine.analyzers.threat import analyze_connections, detect_threats
from engine.scanners.security import run_security_checks
from utils.logger import log_info, log_warn, log_success, Colors as C

def run(deep=False):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    log_info("Starting security scan...")
    
    log_info("Collecting connection data...")
    connections = collect_connections()
    
    log_info("Analyzing traffic patterns...")
    analysis = analyze_connections(connections)
    
    log_info("Running threat detection...")
    threats = detect_threats(connections)
    
    results = {}
    if deep:
        log_info("Running deep security checks...")
        results["security_checks"] = run_security_checks(connections)
    
    print()
    print(f"{C.DIM}[{timestamp}]{C.RESET} {C.BOLD}Scan Results{C.RESET}")
    print(f"{C.DIM}{'─' * 50}{C.RESET}")
    print(f"  {C.DIM}Total Connections:{C.RESET}  {C.WHITE}{analysis['total']}{C.RESET}")
    print(f"  {C.DIM}Established:{C.RESET}        {C.GREEN}{analysis['established']}{C.RESET}")
    print(f"  {C.DIM}Listening:{C.RESET}          {C.YELLOW}{analysis['listening']}{C.RESET}")
    
    if len(threats) > 0:
        print(f"  {C.DIM}Threats Detected:{C.RESET}   {C.RED}{C.BOLD}{len(threats)}{C.RESET}")
    else:
        print(f"  {C.DIM}Threats Detected:{C.RESET}   {C.GREEN}0{C.RESET}")
    
    print(f"{C.DIM}{'─' * 50}{C.RESET}")
    
    if threats:
        print()
        log_warn(f"Threats found: {len(threats)}")
        for threat in threats[:10]:
            print(f"  {C.RED}>{C.RESET} {threat}")
    
    if deep and "security_checks" in results:
        print()
        print(f"{C.BOLD}Deep Security Checks{C.RESET}")
        print(f"{C.DIM}{'─' * 70}{C.RESET}")
        print(f"{C.DIM}  {'CHECK':<30} {'STATUS':<8} {'DETAILS'}{C.RESET}")
        print(f"{C.DIM}{'─' * 70}{C.RESET}")
        
        for check in results["security_checks"]:
            if check["passed"]:
                status = f"{C.GREEN}PASS{C.RESET}"
            else:
                status = f"{C.RED}FAIL{C.RESET}"
            
            print(f"  {check['name']:<30} {status:<17} {C.DIM}{check.get('details', '')}{C.RESET}")
        
        print(f"{C.DIM}{'─' * 70}{C.RESET}")
    
    print()
    if threats:
        log_warn(f"Scan complete: {len(threats)} threat(s) detected")
    else:
        log_success("Scan complete: No threats detected")
    
    print()
