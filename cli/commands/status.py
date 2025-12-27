"""
Status Command - One-line health check
"""

import socket
from rich.console import Console

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections
from cli.utils.display import get_status_emoji, get_threat_level


console = Console()


def run():
    """Execute the status command - prints a single line status"""
    
    connections = collect_connections()
    analysis = analyze_connections(connections)
    
    hostname = socket.gethostname()
    threat_level = get_threat_level(analysis["alerts_count"])
    status_emoji = get_status_emoji(threat_level)
    
    # Build one-liner
    if threat_level == "secure":
        console.print(
            f"{status_emoji} [bold green]SECURE[/bold green] | "
            f"[dim]{hostname}[/dim] | "
            f"[cyan]{analysis['established']}[/cyan] established, "
            f"[yellow]{analysis['listening']}[/yellow] listening, "
            f"[dim]{analysis['total']} total[/dim]"
        )
    else:
        console.print(
            f"{status_emoji} [bold red]ALERT[/bold red] | "
            f"[dim]{hostname}[/dim] | "
            f"[red]{analysis['alerts_count']} threat(s)[/red] | "
            f"[cyan]{analysis['established']}[/cyan] established, "
            f"[dim]{analysis['total']} total[/dim]"
        )
