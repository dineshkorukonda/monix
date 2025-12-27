"""
Monitor Command - Quick snapshot of system status
"""

import json
import socket
from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections
from cli.utils.display import get_status_emoji, get_threat_level
from cli.utils.geo import get_my_location


console = Console()


def run(output_json=False):
    """Execute the monitor command"""
    
    # Collect data
    connections = collect_connections()
    analysis = analyze_connections(connections)
    
    if output_json:
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "hostname": socket.gethostname(),
            "connections": analysis,
            "status": "secure" if analysis["alerts_count"] == 0 else "alert"
        }
        console.print_json(json.dumps(output_data))
        return
    
    # Build rich output
    hostname = socket.gethostname()
    location = get_my_location()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Header
    console.print()
    console.print(Panel.fit(
        "[bold cyan]🛡️ Monarx Sentinel[/bold cyan] [dim]- Quick Status[/dim]",
        border_style="cyan"
    ))
    
    # System Info
    console.print(f"[dim]📍 Host:[/dim] [bold]{hostname}[/bold] [dim]|[/dim] [dim]Location:[/dim] {location}")
    console.print(f"[dim]🕐 Time:[/dim] {now}")
    console.print()
    
    # Connection Stats
    stats_table = Table(show_header=False, box=None, padding=(0, 2))
    stats_table.add_column("Label", style="dim")
    stats_table.add_column("Value", style="bold")
    
    stats_table.add_row("✓ Established", f"[green]{analysis['established']}[/green]")
    stats_table.add_row("◐ Listening", f"[yellow]{analysis['listening']}[/yellow]")
    stats_table.add_row("⟳ Time Wait", f"[dim]{analysis['time_wait']}[/dim]")
    stats_table.add_row("━ Total", f"[cyan]{analysis['total']}[/cyan]")
    
    console.print(Panel(stats_table, title="[bold]📊 Connections[/bold]", border_style="blue"))
    
    # Security Status
    threat_level = get_threat_level(analysis["alerts_count"])
    status_emoji = get_status_emoji(threat_level)
    
    if threat_level == "secure":
        console.print(Panel(
            f"[bold green]{status_emoji} Status: SECURE[/bold green]\n"
            f"[dim]No active threats detected[/dim]",
            border_style="green"
        ))
    else:
        console.print(Panel(
            f"[bold red]{status_emoji} Status: {threat_level.upper()}[/bold red]\n"
            f"[dim]{analysis['alerts_count']} active alert(s)[/dim]",
            border_style="red"
        ))
    
    # Top Processes
    if analysis["top_processes"]:
        console.print()
        console.print("[bold]Top Processes:[/bold]")
        for proc, count in analysis["top_processes"][:5]:
            console.print(f"   [cyan]{proc}[/cyan] → {count} connections")
    
    console.print()
