import os
import sys
import time
from collections import defaultdict
from threading import Thread

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from engine.monitoring.state import state
from engine.analyzers.traffic import get_traffic_summary, DEFAULT_LOG_PATH
from utils.network import TCP_STATES, hex_ip, hex_port
from utils.geo import geo_lookup, reverse_dns
from utils.processes import get_process_map

PORT_SCAN_WINDOW = 10
PORT_SCAN_THRESHOLD = 5
port_activity = defaultdict(lambda: defaultdict(float))

def detect_attacks(conns):
    syn_count = defaultdict(int)
    conn_count = defaultdict(int)
    now = time.time()

    for c in conns:
        if c["state"] == "SYN_RECV":
            syn_count[c["remote_ip"]] += 1
        
        if c["state"] == "ESTABLISHED":
            conn_count[c["remote_ip"]] += 1

        ip = c["remote_ip"]
        port = c["local_port"]
        if ip not in ["127.0.0.1", "0.0.0.0", "::1", "::"]:
            port_activity[ip][port] = now

    for ip, count in syn_count.items():
        if count >= 100:
            state.add_alert(f"SYN_FLOOD from {ip} (half-open={count})", key=f"syn_{ip}")
    
    for ip, count in conn_count.items():
        if count >= 50:
            state.add_alert(f"HIGH_CONN from {ip} (total={count})", key=f"high_conn_{ip}")

    for ip, ports in port_activity.items():
        recent = [p for p, ts in ports.items() if now - ts <= PORT_SCAN_WINDOW]
        if len(recent) >= PORT_SCAN_THRESHOLD:
            state.add_alert(f"PORT_SCAN from {ip} (ports: {recent})", key=f"scan_{ip}")

def collector_loop():
    while True:
        conns = []
        process_map = get_process_map()
        
        for proc_file in ["/proc/net/tcp", "/proc/net/tcp6"]:
            if not os.path.exists(proc_file):
                continue
                
            with open(proc_file, "r") as f:
                lines = f.readlines()[1:]

            for line in lines:
                p = line.split()
                lip_hex, rip_hex = p[1], p[2]
                lip, lport = lip_hex.split(":")
                rip, rport = rip_hex.split(":")

                conn = {
                    "local_ip": hex_ip(lip),
                    "local_port": hex_port(lport),
                    "remote_ip": hex_ip(rip),
                    "remote_port": hex_port(rport),
                    "state": TCP_STATES.get(p[3], "UNKNOWN"),
                }

                pid, pname = process_map.get((conn["local_ip"], conn["local_port"]), (None, None))
                conn["pid"] = pid or "-"
                conn["pname"] = pname or ""

                conn["geo"] = geo_lookup(conn["remote_ip"])
                conn["domain"] = reverse_dns(conn["remote_ip"])
                conns.append(conn)

        state.update_connections(conns)
        detect_attacks(conns)
        
        # Update traffic analysis every 5 seconds to reduce I/O
        if int(time.time()) % 5 == 0:
            try:
                traffic_summary = get_traffic_summary(DEFAULT_LOG_PATH, window_minutes=10)
                state.update_traffic(traffic_summary)
            except Exception:
                pass  # Log file may not be accessible
        
        time.sleep(1)

def start_monitor():
    t = Thread(target=collector_loop, daemon=True)
    t.start()
