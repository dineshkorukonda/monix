import os
import socket

def run_security_checks(connections):
    checks = []
    checks.append(check_ssh_port(connections))
    checks.append(check_dangerous_ports(connections))
    checks.append(check_listening_count(connections))
    checks.append(check_sensitive_external(connections))
    checks.append(check_outbound_suspicious(connections))
    return checks

def check_ssh_port(connections):
    ssh_on_22 = any(
        c["local_port"] == 22 and c["state"] == "LISTEN"
        for c in connections
    )
    return {
        "name": "SSH Port Check",
        "passed": not ssh_on_22,
        "details": "SSH on port 22 (consider changing)" if ssh_on_22 else "SSH not on default port or not running"
    }

def check_dangerous_ports(connections):
    dangerous_ports = {
        21: "FTP",
        23: "Telnet",
        135: "RPC",
        139: "NetBIOS",
        445: "SMB",
        3389: "RDP",
        5900: "VNC"
    }
    found = []
    for conn in connections:
        if conn["state"] == "LISTEN" and conn["local_port"] in dangerous_ports:
            found.append(f"{dangerous_ports[conn['local_port']]}:{conn['local_port']}")
    return {
        "name": "Dangerous Ports",
        "passed": len(found) == 0,
        "details": f"Open: {', '.join(found)}" if found else "No commonly exploited ports open"
    }

def check_listening_count(connections):
    listening = [c for c in connections if c["state"] == "LISTEN"]
    count = len(listening)
    return {
        "name": "Listening Ports Count",
        "passed": count < 50,
        "details": f"{count} ports listening" + (" (high)" if count >= 50 else "")
    }

def check_sensitive_external(connections):
    sensitive_ports = [22, 3306, 5432, 6379, 27017, 9200]
    external_sensitive = []
    for conn in connections:
        if (conn["state"] == "ESTABLISHED" and 
            conn["local_port"] in sensitive_ports and
            conn["remote_ip"] not in ["127.0.0.1", "0.0.0.0", "::1", "::"]):
            external_sensitive.append(f"{conn['remote_ip']}→{conn['local_port']}")
    return {
        "name": "External DB/Service Access",
        "passed": len(external_sensitive) == 0,
        "details": f"External access: {', '.join(external_sensitive[:5])}" if external_sensitive else "No external sensitive port access"
    }

def check_outbound_suspicious(connections):
    suspicious_ports = [4444, 5555, 6666, 7777, 8888, 9999, 31337]
    suspicious = []
    for conn in connections:
        if (conn["state"] == "ESTABLISHED" and 
            conn["remote_port"] in suspicious_ports):
            suspicious.append(f"{conn['remote_ip']}:{conn['remote_port']}")
    return {
        "name": "Suspicious Outbound",
        "passed": len(suspicious) == 0,
        "details": f"Suspicious: {', '.join(suspicious)}" if suspicious else "No suspicious outbound connections"
    }
