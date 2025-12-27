"""
Watch Command - Live security dashboard
"""

import socket
import time
from datetime import datetime
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections, detect_threats
from cli.utils.geo import get_my_location


console = Console()
hostname = socket.gethostname()


def build_dashboard():
    """Build the live dashboard layout"""
    
    connections = collect_connections()
    analysis = analyze_connections(connections)
    threats = detect_threats(connections)
    
    layout = Layout()
    layout.split(
        Layout(name="header", size=3),
        Layout(name="body"),
        Layout(name="footer", size=10)
    )
    
    # Header
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    location = get_my_location()
    
    title = Panel(
        f"[bold cyan]🛡️ Monarx Sentinel[/bold cyan] — [bold]{hostname}[/bold]\n"
        f"[dim]Live Security Dashboard | Location: {location} | Time: {now}[/dim]",
        border_style="cyan"
    )
    layout["header"].update(title)
    
    # Connection Table
    table = Table(
        show_header=True,
        header_style="bold cyan",
        border_style="dim",
        expand=True
    )
    table.add_column("STATE", style="cyan", width=12)
    table.add_column("REMOTE", style="magenta")
    table.add_column("LOCAL", style="green", width=22)
    table.add_column("PROCESS", style="white")
    table.add_column("GEO/ORG", style="blue")
    
    # Sort connections - ESTABLISHED first
    sorted_conns = sorted(
        connections,
        key=lambda x: (x["state"] != "ESTABLISHED", x["state"])
    )
    
    for conn in sorted_conns[:20]:
        state_style = "cyan"
        if conn["state"] == "ESTABLISHED":
            state_style = "bold green"
        elif conn["state"] == "LISTEN":
            state_style = "yellow"
        elif "WAIT" in conn["state"]:
            state_style = "dim"
        
        remote = f"{conn['remote_ip']}:{conn['remote_port']}"
        if conn.get('domain'):
            remote = f"[bold]{conn['domain']}[/bold]\n{remote}"
        
        local = f"{conn['local_ip']}:{conn['local_port']}"
        process = f"{conn['pid']} {conn['pname']}" if conn.get('pname') else str(conn.get('pid', '-'))
        
        table.add_row(
            f"[{state_style}]{conn['state']}[/{state_style}]",
            remote,
            local,
            process,
            conn.get('geo', '')[:40]
        )
    
    layout["body"].update(table)
    
    # Footer - Alerts & Stats
    alerts_text = "\n".join(threats[:5]) if threats else "[green]✅ No active threats detected[/green]"
    
    footer_content = (
        f"[bold red]Security Alerts:[/bold red]\n{alerts_text}\n\n"
        f"[bold cyan]Stats:[/bold cyan] "
        f"[green]{analysis['established']}[/green] Established | "
        f"[yellow]{analysis['listening']}[/yellow] Listening | "
        f"[dim]{analysis['total']} total sockets[/dim]"
    )
    
    footer = Panel(
        footer_content,
        border_style="red" if threats else "green",
        title="[bold]Security Status[/bold]"
    )
    layout["footer"].update(footer)
    
    return layout


def run(refresh_interval=3):
    """Execute the watch command with live updates"""
    
    console.print("[dim]Starting live dashboard... Press Ctrl+C to exit[/dim]")
    
    try:
        with Live(refresh_per_second=0.5, screen=True) as live:
            while True:
                live.update(build_dashboard())
                time.sleep(refresh_interval)
    except KeyboardInterrupt:
        console.print("\n[dim]Dashboard stopped.[/dim]")
