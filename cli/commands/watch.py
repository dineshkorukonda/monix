"""
Watch Command - Live security dashboard
"""

import os
import socket
import time
from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections, detect_threats
from cli.utils.logger import log_info, log_warn, log_error, log_action


hostname = socket.gethostname()


def clear_screen():
    """Clear terminal screen"""
    os.system('clear' if os.name == 'posix' else 'cls')


def run(refresh_interval=3):
    """Execute the watch command with live updates"""
    
    log_info("Starting live monitor... Press Ctrl+C to exit")
    print()
    
    try:
        while True:
            clear_screen()
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            connections = collect_connections()
            analysis = analyze_connections(connections)
            threats = detect_threats(connections)
            
            # Header
            print("=" * 70)
            print(f"  MONARX SENTINEL | {hostname} | {timestamp}")
            print("=" * 70)
            print()
            
            # Stats
            print(f"  Connections: {analysis['total']} total | {analysis['established']} established | {analysis['listening']} listening")
            print(f"  Time Wait: {analysis['time_wait']} | SYN Recv: {analysis['syn_recv']}")
            print()
            
            # Top processes
            if analysis["top_processes"]:
                print("  TOP PROCESSES:")
                for proc, count in analysis["top_processes"][:5]:
                    print(f"    {proc}: {count} connections")
                print()
            
            # Connection table
            print("  ACTIVE CONNECTIONS:")
            print("  " + "-" * 66)
            print(f"  {'STATE':<12} {'LOCAL':<22} {'REMOTE':<22} {'PROCESS':<10}")
            print("  " + "-" * 66)
            
            sorted_conns = sorted(
                connections,
                key=lambda x: (x["state"] != "ESTABLISHED", x["state"])
            )
            
            for conn in sorted_conns[:15]:
                local = f"{conn['local_ip']}:{conn['local_port']}"[:20]
                remote = f"{conn['remote_ip']}:{conn['remote_port']}"[:20]
                proc = str(conn.get('pname', '') or conn.get('pid', '-'))[:10]
                print(f"  {conn['state']:<12} {local:<22} {remote:<22} {proc:<10}")
            
            print()
            
            # Alerts
            if threats:
                print("  ALERTS:")
                for threat in threats[:5]:
                    print(f"  [WARN] {threat}")
            else:
                print("  [INFO] No active threats detected")
            
            print()
            print("=" * 70)
            
            time.sleep(refresh_interval)
            
    except KeyboardInterrupt:
        print("\n")
        log_info("Monitor stopped.")
