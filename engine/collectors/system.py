"""
System monitoring module for Monix.

This module provides functionality to monitor system resources including:
- CPU usage and load averages
- Memory consumption (RAM and swap)
- Disk usage and I/O statistics
- Network I/O statistics
- Process counts and system uptime

Technical Rationale:
    System resource monitoring is essential for detecting performance anomalies
    that may indicate security incidents (e.g., CPU spikes from cryptominers,
    memory exhaustion from DoS attacks, unusual disk activity from data exfiltration).
    This enables proactive detection of compromised systems.
"""

import os
import sys
import time
import psutil
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def get_system_stats() -> Dict[str, Any]:
    """
    Collect comprehensive system statistics.
    
    Returns:
        Dictionary containing:
        - cpu_percent: Current CPU usage percentage
        - memory_percent: Current memory usage percentage
        - disk_percent: Current disk usage percentage (root partition)
        - network_sent: Bytes sent since boot
        - network_recv: Bytes received since boot
        - uptime: System uptime in seconds
        - load_avg: System load averages (1min, 5min, 15min)
        - process_count: Total number of running processes
    """
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # Disk usage (root partition)
        disk = psutil.disk_usage('/')
        disk_percent = disk.percent
        
        # Network I/O
        net_io = psutil.net_io_counters()
        network_sent = net_io.bytes_sent
        network_recv = net_io.bytes_recv
        
        # System uptime
        boot_time = psutil.boot_time()
        uptime = time.time() - boot_time
        
        # Load averages (Unix-like systems)
        try:
            load_avg = os.getloadavg()
        except (OSError, AttributeError):
            # Windows or systems without loadavg
            load_avg = [0.0, 0.0, 0.0]
        
        # Process count
        process_count = len(psutil.pids())
        
        return {
            "cpu_percent": round(cpu_percent, 2),
            "memory_percent": round(memory_percent, 2),
            "disk_percent": round(disk_percent, 2),
            "network_sent": network_sent,
            "network_recv": network_recv,
            "uptime": int(uptime),
            "load_avg": [round(load, 2) for load in load_avg],
            "process_count": process_count,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        # Return minimal stats on error
        return {
            "cpu_percent": 0.0,
            "memory_percent": 0.0,
            "disk_percent": 0.0,
            "network_sent": 0,
            "network_recv": 0,
            "uptime": 0,
            "load_avg": [0.0, 0.0, 0.0],
            "process_count": 0,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


def get_top_processes(limit: int = 10) -> list:
    """
    Get top processes by CPU usage.
    
    Args:
        limit: Maximum number of processes to return
        
    Returns:
        List of process dictionaries with pid, name, cpu_percent, memory_percent
    """
    processes = []
    
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                proc.info['cpu_percent'] = proc.cpu_percent(interval=0.1)
                processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        return processes[:limit]
    except Exception:
        return []


def get_disk_io() -> Dict[str, Any]:
    """
    Get disk I/O statistics.
    
    Returns:
        Dictionary with read/write counts and bytes
    """
    try:
        disk_io = psutil.disk_io_counters()
        if disk_io:
            return {
                "read_count": disk_io.read_count,
                "write_count": disk_io.write_count,
                "read_bytes": disk_io.read_bytes,
                "write_bytes": disk_io.write_bytes,
                "read_time": disk_io.read_time,
                "write_time": disk_io.write_time
            }
        return {}
    except Exception:
        return {}


def format_uptime(seconds: float) -> str:
    """
    Format uptime in human-readable format.
    
    Args:
        seconds: Uptime in seconds
        
    Returns:
        Formatted string (e.g., "5d 12h 30m")
    """
    days = int(seconds // 86400)
    hours = int((seconds % 86400) // 3600)
    minutes = int((seconds % 3600) // 60)
    
    parts = []
    if days > 0:
        parts.append(f"{days}d")
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    
    return " ".join(parts) if parts else "<1m"


def format_bytes(bytes_count: int) -> str:
    """
    Format byte count in human-readable format.
    
    Args:
        bytes_count: Number of bytes
        
    Returns:
        Formatted string (e.g., "1.5 GB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_count < 1024.0:
            return f"{bytes_count:.2f} {unit}"
        bytes_count /= 1024.0
    return f"{bytes_count:.2f} PB"
