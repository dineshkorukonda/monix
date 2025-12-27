"""
Watch Command - Live security dashboard
"""

import os
import socket
import time
from datetime import datetime

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections, detect_threats
from cli.utils.logger import log_info, log_warn, Colors as C


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
            print(f"{C.DIM}{'═' * 70}{C.RESET}")
            print(f"  {C.BOLD}{C.CYAN}MONARX SENTINEL{C.RESET} {C.DIM}|{C.RESET} {C.WHITE}{hostname}{C.RESET} {C.DIM}|{C.RESET} {C.DIM}{timestamp}{C.RESET}")
            print(f"{C.DIM}{'═' * 70}{C.RESET}")
            print()
            
            # Stats
            total = f"{C.BOLD}{C.WHITE}{analysis['total']}{C.RESET}"
            est = f"{C.GREEN}{analysis['established']}{C.RESET}"
            listen = f"{C.YELLOW}{analysis['listening']}{C.RESET}"
            
            print(f"  {C.DIM}Connections:{C.RESET} {total} total {C.DIM}|{C.RESET} {est} established {C.DIM}|{C.RESET} {listen} listening")
            print(f"  {C.DIM}Time Wait:{C.RESET} {analysis['time_wait']} {C.DIM}|{C.RESET} {C.DIM}SYN Recv:{C.RESET} {analysis['syn_recv']}")
            print()
            
            # Top processes
            if analysis["top_processes"]:
                print(f"  {C.BOLD}TOP PROCESSES{C.RESET}")
                for proc, count in analysis["top_processes"][:5]:
                    bar_len = min(count, 20)
                    bar = f"{C.CYAN}{'█' * bar_len}{C.RESET}"
                    print(f"    {C.CYAN}{proc:<20}{C.RESET} {bar} {C.DIM}{count}{C.RESET}")
                print()
            
            # Connection table
            print(f"  {C.BOLD}ACTIVE CONNECTIONS{C.RESET}")
            print(f"  {C.DIM}{'─' * 66}{C.RESET}")
            print(f"  {C.DIM}{'STATE':<12} {'LOCAL':<22} {'REMOTE':<22} {'PROCESS':<10}{C.RESET}")
            print(f"  {C.DIM}{'─' * 66}{C.RESET}")
            
            sorted_conns = sorted(
                connections,
                key=lambda x: (x["state"] != "ESTABLISHED", x["state"])
            )
            
            for conn in sorted_conns[:15]:
                # Color based on state
                if conn['state'] == 'ESTABLISHED':
                    state_color = C.GREEN
                elif conn['state'] == 'LISTEN':
                    state_color = C.YELLOW
                elif 'WAIT' in conn['state']:
                    state_color = C.DIM
                else:
                    state_color = C.WHITE
                
                local = f"{conn['local_ip']}:{conn['local_port']}"[:20]
                remote = f"{conn['remote_ip']}:{conn['remote_port']}"[:20]
                proc = str(conn.get('pname', '') or conn.get('pid', '-'))[:10]
                
                print(f"  {state_color}{conn['state']:<12}{C.RESET} {local:<22} {C.MAGENTA}{remote:<22}{C.RESET} {C.CYAN}{proc:<10}{C.RESET}")
            
            print()
            
            # Alerts
            if threats:
                print(f"  {C.BOLD}{C.RED}ALERTS{C.RESET}")
                for threat in threats[:5]:
                    print(f"  {C.YELLOW}>{C.RESET} {threat}")
            else:
                print(f"  {C.GREEN}>{C.RESET} {C.DIM}No active threats detected{C.RESET}")
            
            print()
            print(f"{C.DIM}{'═' * 70}{C.RESET}")
            
            time.sleep(refresh_interval)
            
    except KeyboardInterrupt:
        print("\n")
        log_info("Monitor stopped.")
