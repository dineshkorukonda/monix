import os
import socket
import struct
import time
from collections import defaultdict
from datetime import datetime
from threading import Thread
from .state import state
from .processes import get_process_map
from .geo import geo_lookup, reverse_dns

TCP_STATES = {
    "01": "ESTABLISHED",
    "02": "SYN_SENT",
    "03": "SYN_RECV",
    "04": "FIN_WAIT1",
    "05": "FIN_WAIT2",
    "06": "TIME_WAIT",
    "07": "CLOSE",
    "08": "CLOSE_WAIT",
    "09": "LAST_ACK",
    "0A": "LISTEN",
    "0B": "CLOSING",
}

def hex_ip(h):
    if len(h) == 8:  # IPv4
        return socket.inet_ntoa(struct.pack("<L", int(h, 16)))
    else:  # IPv6
        # IPv6 in /proc is 4 32-bit hex words in host byte order
        addr_bytes = struct.pack("<IIII", 
            int(h[0:8], 16), 
            int(h[8:16], 16), 
            int(h[16:24], 16), 
            int(h[24:32], 16)
        )
        return socket.inet_ntop(socket.AF_INET6, addr_bytes)

def hex_port(h): return int(h, 16)


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

    # SYN Flood Alerts
    for ip, count in syn_count.items():
        if count >= 100:
            state.add_alert(f"🚨 SYN_FLOOD {ip} (half-open={count})", key=f"syn_{ip}")
    
    # High Connection Count Alerts
    for ip, count in conn_count.items():
        if count >= 50:
            state.add_alert(f"⚠️ HIGH_CONN {ip} (total={count})", key=f"high_conn_{ip}")

    # Port Scan Alerts
    for ip, ports in port_activity.items():
        recent = [p for p, ts in ports.items() if now - ts <= PORT_SCAN_WINDOW]
        if len(recent) >= PORT_SCAN_THRESHOLD:
            state.add_alert(f"🚨 PORT_SCAN {ip} ports={recent}", key=f"scan_{ip}")


def collector_loop():
    while True:
        conns = []
        process_map = get_process_map()
        
        # Read both IPv4 and IPv6
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

                # O(1) process lookup
                pid, pname = process_map.get((conn["local_ip"], conn["local_port"]), (None, None))
                conn["pid"] = pid or "-"
                conn["pname"] = pname or ""

                conn["geo"] = geo_lookup(conn["remote_ip"])
                conn["domain"] = reverse_dns(conn["remote_ip"])
                conns.append(conn)

        state.update_connections(conns)
        detect_attacks(conns)
        time.sleep(1)


def start_monitor():
    t = Thread(target=collector_loop, daemon=True)
    t.start()
