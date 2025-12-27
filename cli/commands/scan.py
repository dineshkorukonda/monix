"""
Scan Command - Security scan
"""

from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections, detect_threats
from cli.core.scanner import run_security_checks
from cli.utils.logger import log_info, log_warn, log_error, log_action


def run(deep=False):
    """Execute the scan command"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    log_info("Starting security scan...")
    
    # Collect data
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
    print(f"[{timestamp}] Scan Results")
    print("-" * 50)
    print(f"  Total Connections:  {analysis['total']}")
    print(f"  Established:        {analysis['established']}")
    print(f"  Listening:          {analysis['listening']}")
    print(f"  Threats Detected:   {len(threats)}")
    print("-" * 50)
    
    # Show threats
    if threats:
        print()
        log_warn(f"Threats found: {len(threats)}")
        for threat in threats[:10]:
            print(f"  - {threat}")
    
    # Deep scan results
    if deep and "security_checks" in results:
        print()
        print("Deep Security Checks:")
        print("-" * 50)
        print(f"  {'CHECK':<30} {'STATUS':<8} {'DETAILS'}")
        print("-" * 50)
        
        for check in results["security_checks"]:
            status = "PASS" if check["passed"] else "FAIL"
            print(f"  {check['name']:<30} {status:<8} {check.get('details', '')}")
        
        print("-" * 50)
    
    # Final status
    print()
    if threats:
        log_warn(f"Scan complete: {len(threats)} threat(s) detected")
    else:
        log_info("Scan complete: No threats detected")
    
    print()
