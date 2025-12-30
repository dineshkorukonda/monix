import os
import sys
import socket
import time
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.state import state
from core.traffic import classify_threat_level
from shared.geo import get_my_location

console = Console()
hostname = socket.gethostname()
location = get_my_location()

def build_traffic_panel():
    """Build the suspicious traffic panel for the dashboard."""
    traffic_data = state.get_traffic()
    
    if not traffic_data or not traffic_data.get("log_exists"):
        return Panel(
            "[dim]Traffic analysis unavailable\nNginx logs not found[/dim]",
            title="[bold]Web Traffic[/bold]",
            border_style="dim"
        )
    
    suspicious_ips = traffic_data.get("suspicious_ips", [])
    
    if not suspicious_ips:
        content = "[green]No suspicious traffic detected[/green]\n"
        content += f"[dim]Analyzed {traffic_data.get('total_requests', 0):,} requests from {traffic_data.get('unique_ips', 0)} IPs[/dim]"
        return Panel(
            content,
            title="[bold]Web Traffic (Last 10 mins)[/bold]",
            border_style="green"
        )
    
    # Build traffic table
    table = Table(show_header=True, header_style="bold red", border_style="red", expand=True, padding=(0, 1))
    table.add_column("IP", style="yellow", width=16)
    table.add_column("HITS", justify="right", width=5)
    table.add_column("THREAT", width=8)
    table.add_column("SUSPICIOUS URLs", style="magenta")
    
    for ip_data in suspicious_ips[:5]:  # Show top 5
        level_name, level_color = classify_threat_level(ip_data.threat_score)
        
        urls = ", ".join(ip_data.suspicious_urls[:2])
        if len(ip_data.suspicious_urls) > 2:
            urls += f" +{len(ip_data.suspicious_urls) - 2}"
        if not urls:
            urls = "-"
        
        table.add_row(
            ip_data.ip,
            str(ip_data.total_hits),
            f"[{level_color}]{level_name}[/{level_color}]",
            urls
        )
    
    return Panel(
        table,
        title=f"[bold red]⚠ Suspicious Traffic ({len(suspicious_ips)} IPs)[/bold red]",
        border_style="red"
    )


def build_dashboard():
    conns, alerts = state.snapshot()

    layout = Layout()

    layout.split(
        Layout(name="header", size=3),
        Layout(name="main"),
        Layout(name="footer", size=10)
    )
    
    # Split main into body and traffic panel
    layout["main"].split_row(
        Layout(name="body", ratio=2),
        Layout(name="traffic", ratio=1)
    )

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    title = Panel(
        f"[bold yellow]Monix — {hostname}[/bold yellow]\n"
        f"[gray]Live Security Dashboard | Location: {location} | Time: {now}[/gray]",
        border_style="bright_black"
    )
    layout["header"].update(title)

    table = Table(show_header=True, header_style="bold yellow", border_style="bright_black", expand=True)
    table.add_column("STATE", style="cyan", width=12)
    table.add_column("REMOTE (DOMAIN/IP)", style="magenta")
    table.add_column("LOCAL", style="green", width=22)
    table.add_column("PID/PROCESS", style="white")
    table.add_column("SECURITY STATUS & GEOIP", style="bright_blue")

    conns_sorted = sorted(conns, key=lambda x: (x["state"] != "ESTABLISHED", x["state"]))

    for c in conns_sorted[:25]:
        remote_display = f"[bold]{c['domain']}[/bold]\n{c['remote_ip']}:{c['remote_port']}" if c['domain'] else f"{c['remote_ip']}:{c['remote_port']}"
        
        state_style = "cyan"
        if c["state"] == "ESTABLISHED": state_style = "bold green"
        elif c["state"] == "LISTEN": state_style = "yellow"
        elif "WAIT" in c["state"]: state_style = "dim"
        
        process_display = f"[bold]{c['pid']}[/bold] {c['pname']}" if c['pname'] else f"{c['pid']}"
        
        table.add_row(
            f"[{state_style}]{c['state']}[/{state_style}]",
            remote_display,
            f"{c['local_ip']}:{c['local_port']}",
            process_display,
            f"{c['geo']}"
        )

    layout["body"].update(table)
    
    # Add traffic panel
    layout["traffic"].update(build_traffic_panel())

    alerts_text = "\n".join(alerts[:6]) if alerts else "[green]No active threats detected[/green]"
    
    established = len([c for c in conns if c["state"] == "ESTABLISHED"])
    listening = len([c for c in conns if c["state"] == "LISTEN"])
    
    footer_content = (
        f"[bold red]Security Alerts:[/bold red]\n{alerts_text}\n\n"
        f"[bold cyan]Stats:[/bold cyan] {established} Established | {listening} Listening | "
        f"Tracking {len(conns)} total sockets"
    )
    
    footer = Panel(
        footer_content,
        border_style="red" if alerts else "green",
        title="[bold]Security Status[/bold]"
    )
    layout["footer"].update(footer)

    return layout

def start_ui():
    with Live(refresh_per_second=0.3, screen=True) as live:
        while True:
            live.update(build_dashboard())
            time.sleep(3)
