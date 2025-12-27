"""
Connections Command - List active connections
"""

import json
from datetime import datetime

from cli.core.collector import collect_connections
from cli.utils.logger import log_info


def run(state_filter=None, limit=20, output_json=False):
    """Execute the connections command"""
    
    connections = collect_connections()
    
    # Filter by state if specified
    if state_filter:
        state_filter = state_filter.upper()
        connections = [c for c in connections if c["state"] == state_filter]
    
    # Limit results
    connections = connections[:limit]
    
    if output_json:
        print(json.dumps(connections, indent=2, default=str))
        return
    
    if not connections:
        log_info("No connections found matching criteria")
        return
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    print(f"[{timestamp}] Active Connections ({len(connections)} shown)")
    print("-" * 90)
    print(f"{'STATE':<12} {'LOCAL':<24} {'REMOTE':<24} {'PID':<8} {'PROCESS':<15}")
    print("-" * 90)
    
    for conn in connections:
        local = f"{conn['local_ip']}:{conn['local_port']}"[:22]
        remote = f"{conn['remote_ip']}:{conn['remote_port']}"[:22]
        pid = str(conn.get('pid', '-'))[:6]
        proc = str(conn.get('pname', ''))[:15]
        
        print(f"{conn['state']:<12} {local:<24} {remote:<24} {pid:<8} {proc:<15}")
    
    print("-" * 90)
    print()
