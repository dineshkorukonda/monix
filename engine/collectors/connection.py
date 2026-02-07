import os
import sys
import psutil

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.geo import geo_lookup, reverse_dns
from utils.network import TCP_STATES, hex_ip, hex_port
from utils.processes import get_process_map

def collect_connections():
    connections = []
    process_map = get_process_map()
    
    proc_files = ["/proc/net/tcp", "/proc/net/tcp6"]
    proc_available = any(os.path.exists(f) for f in proc_files)
    
    if proc_available:
        for proc_file in proc_files:
            if not os.path.exists(proc_file):
                continue
            
            try:
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
                    
                    pid, pname = process_map.get(
                        (conn["local_ip"], conn["local_port"]),
                        (None, None)
                    )
                    conn["pid"] = pid or "-"
                    conn["pname"] = pname or ""
                    
                    if conn["remote_ip"] not in ["127.0.0.1", "0.0.0.0", "::1", "::"]:
                        conn["geo"] = geo_lookup(conn["remote_ip"])
                        conn["domain"] = reverse_dns(conn["remote_ip"])
                    else:
                        conn["geo"] = ""
                        conn["domain"] = ""
                    
                    connections.append(conn)
            except Exception:
                continue
    else:
        try:
            for c in psutil.net_connections(kind="tcp"):
                if not c.laddr:
                    continue
                
                conn = {
                    "local_ip": c.laddr.ip,
                    "local_port": c.laddr.port,
                    "remote_ip": c.raddr.ip if c.raddr else "0.0.0.0",
                    "remote_port": c.raddr.port if c.raddr else 0,
                    "state": c.status,
                    "pid": c.pid or "-",
                    "pname": ""
                }
                
                if c.pid:
                    try:
                        p = psutil.Process(c.pid)
                        conn["pname"] = p.name()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                if conn["remote_ip"] not in ["127.0.0.1", "0.0.0.0", "::1", "::", ""]:
                    conn["geo"] = geo_lookup(conn["remote_ip"])
                    conn["domain"] = reverse_dns(conn["remote_ip"])
                else:
                    conn["geo"] = ""
                    conn["domain"] = ""
                
                connections.append(conn)
        except Exception:
            pass
    
    return connections
