"""
Data collection modules for Monix.

This package contains modules responsible for gathering system and network data:
- connection: Network connection collection from /proc/net/tcp or psutil
- system: System resource monitoring (CPU, memory, disk, network I/O)
"""

from core.collectors.connection import collect_connections
from core.collectors.system import (
    get_system_stats,
    get_top_processes,
    get_disk_io,
    format_uptime,
    format_bytes
)

__all__ = [
    'collect_connections',
    'get_system_stats',
    'get_top_processes',
    'get_disk_io',
    'format_uptime',
    'format_bytes'
]
