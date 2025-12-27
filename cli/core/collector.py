"""
Connection Collector - Gathers network connection data
"""

import os
import socket
import struct
import psutil

from cli.utils.geo import geo_lookup, reverse_dns


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
    """Convert hex IP address to human readable format"""
    if len(h) == 8:  # IPv4
        return socket.inet_ntoa(struct.pack("<L", int(h, 16)))
    else:  # IPv6
        addr_bytes = struct.pack(
            "<IIII",
            int(h[0:8], 16),
            int(h[8:16], 16),
            int(h[16:24], 16),
            int(h[24:32], 16)
        )
        return socket.inet_ntop(socket.AF_INET6, addr_bytes)


def hex_port(h):
    """Convert hex port to integer"""
    return int(h, 16)


def get_process_map():
    """
    Returns a map of (local_ip, local_port) -> (pid, pname)
    """
    process_map = {}
    try:
        for c in psutil.net_connections(kind="tcp"):
            if c.laddr and c.pid:
                try:
                    p = psutil.Process(c.pid)
                    pname = p.name()
                    
                    # Enhance process names for common interpreters
                    if pname.lower() in ["node", "python", "python3", "php", "ruby"]:
                        try:
                            cmdline = p.cmdline()
                            if cmdline and len(cmdline) > 1:
                                for arg in cmdline[1:]:
                                    if "/" in arg or arg.endswith((".js", ".py", ".php", ".rb")):
                                        script_name = arg.split("/")[-1]
                                        pname = f"{pname}:{script_name}"
                                        break
                        except (psutil.AccessDenied, psutil.NoSuchProcess):
                            pass
                    
                    process_map[(c.laddr.ip, c.laddr.port)] = (c.pid, pname)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
    except Exception:
        pass
    return process_map


def collect_connections():
    """
    Collect all TCP connections with metadata
    """
    connections = []
    process_map = get_process_map()
    
    # Try Linux /proc method first
    proc_files = ["/proc/net/tcp", "/proc/net/tcp6"]
    proc_available = any(os.path.exists(f) for f in proc_files)
    
    if proc_available:
        # Linux: Read from /proc
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
                    
                    # Process lookup
                    pid, pname = process_map.get(
                        (conn["local_ip"], conn["local_port"]),
                        (None, None)
                    )
                    conn["pid"] = pid or "-"
                    conn["pname"] = pname or ""
                    
                    # GeoIP and DNS (skip for local addresses)
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
        # macOS/Other: Use psutil
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
                
                # Get process name
                if c.pid:
                    try:
                        p = psutil.Process(c.pid)
                        conn["pname"] = p.name()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                
                # GeoIP and DNS
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
