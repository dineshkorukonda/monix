"""
Connection Analyzer - Analyzes connections and detects threats
"""

from collections import defaultdict, Counter


def analyze_connections(connections):
    """
    Analyze connections and return statistics
    """
    stats = {
        "total": len(connections),
        "established": 0,
        "listening": 0,
        "time_wait": 0,
        "syn_recv": 0,
        "other": 0,
        "alerts_count": 0,
        "top_processes": [],
        "top_remote_ips": [],
    }
    
    process_counts = Counter()
    remote_ip_counts = Counter()
    
    for conn in connections:
        state = conn.get("state", "")
        
        if state == "ESTABLISHED":
            stats["established"] += 1
        elif state == "LISTEN":
            stats["listening"] += 1
        elif state == "TIME_WAIT":
            stats["time_wait"] += 1
        elif state == "SYN_RECV":
            stats["syn_recv"] += 1
        else:
            stats["other"] += 1
        
        # Track processes
        if conn.get("pname"):
            process_counts[conn["pname"]] += 1
        elif conn.get("pid") and conn["pid"] != "-":
            process_counts[f"PID:{conn['pid']}"] += 1
        
        # Track remote IPs
        remote_ip = conn.get("remote_ip", "")
        if remote_ip and remote_ip not in ["127.0.0.1", "0.0.0.0", "::1", "::"]:
            remote_ip_counts[remote_ip] += 1
    
    # Get top processes
    stats["top_processes"] = process_counts.most_common(10)
    stats["top_remote_ips"] = remote_ip_counts.most_common(10)
    
    # Calculate alerts
    threats = detect_threats(connections)
    stats["alerts_count"] = len(threats)
    
    return stats


def detect_threats(connections):
    """
    Detect potential security threats in connections
    """
    threats = []
    
    syn_count = defaultdict(int)
    conn_count = defaultdict(int)
    port_activity = defaultdict(set)
    
    for conn in connections:
        state = conn.get("state", "")
        remote_ip = conn.get("remote_ip", "")
        local_port = conn.get("local_port", 0)
        
        # Skip local addresses
        if remote_ip in ["127.0.0.1", "0.0.0.0", "::1", "::"]:
            continue
        
        if state == "SYN_RECV":
            syn_count[remote_ip] += 1
        
        if state == "ESTABLISHED":
            conn_count[remote_ip] += 1
        
        # Track port activity per IP
        port_activity[remote_ip].add(local_port)
    
    # SYN Flood Detection
    for ip, count in syn_count.items():
        if count >= 50:
            threats.append(f"🚨 SYN_FLOOD from {ip} (half-open connections: {count})")
    
    # High Connection Count Detection
    for ip, count in conn_count.items():
        if count >= 30:
            threats.append(f"⚠️ HIGH_CONN from {ip} (total connections: {count})")
    
    # Port Scan Detection
    for ip, ports in port_activity.items():
        if len(ports) >= 5:
            ports_list = sorted(list(ports))[:10]
            threats.append(f"🔍 PORT_SCAN from {ip} (ports: {ports_list})")
    
    return threats
