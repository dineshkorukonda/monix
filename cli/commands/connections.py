import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.collectors.connection import collect_connections
from utils.logger import log_info, Colors as C

def run(state_filter=None, limit=20, output_json=False):
    connections = collect_connections()
    
    if state_filter:
        state_filter = state_filter.upper()
        connections = [c for c in connections if c["state"] == state_filter]
    
    connections = connections[:limit]
    
    if output_json:
        print(json.dumps(connections, indent=2, default=str))
        return
    
    if not connections:
        log_info("No connections found matching criteria")
        return
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    print(f"{C.DIM}[{timestamp}]{C.RESET} {C.BOLD}Active Connections{C.RESET} {C.DIM}({len(connections)} shown){C.RESET}")
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    print(f"{C.DIM}{'STATE':<12} {'LOCAL':<24} {'REMOTE':<24} {'PID':<8} {'PROCESS':<15}{C.RESET}")
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    
    for conn in connections:
        if conn['state'] == 'ESTABLISHED':
            state_color = C.GREEN
        elif conn['state'] == 'LISTEN':
            state_color = C.YELLOW
        elif 'WAIT' in conn['state']:
            state_color = C.DIM
        else:
            state_color = C.WHITE
        
        local = f"{conn['local_ip']}:{conn['local_port']}"[:22]
        remote = f"{conn['remote_ip']}:{conn['remote_port']}"[:22]
        pid = str(conn.get('pid', '-'))[:6]
        proc = str(conn.get('pname', ''))[:15]
        
        print(f"{state_color}{conn['state']:<12}{C.RESET} {local:<24} {C.MAGENTA}{remote:<24}{C.RESET} {C.DIM}{pid:<8}{C.RESET} {C.CYAN}{proc:<15}{C.RESET}")
    
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    print()
