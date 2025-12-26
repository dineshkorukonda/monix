import socket
import time
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from datetime import datetime
from .state import state
from .geo import get_my_location

console = Console()
hostname = socket.gethostname()
location = get_my_location()

def build_dashboard():
    conns, alerts = state.snapshot()

    layout = Layout()

    layout.split(
        Layout(name="header", size=3),
        Layout(name="body"),
        Layout(name="footer", size=10)
    )

    # HEADER
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    title = Panel(
        f"[bold yellow]Monarx servers — {hostname}[/bold yellow]\n"
        f"[gray]Live Security Dashboard | Location: {location} | Time: {now}[/gray]",
        border_style="bright_black"
    )
    layout["header"].update(title)

    # TABLE VIEW
    table = Table(show_header=True, header_style="bold yellow", border_style="bright_black", expand=True)
    table.add_column("STATE", style="cyan", width=12)
    table.add_column("REMOTE (DOMAIN/IP)", style="magenta")
    table.add_column("LOCAL", style="green", width=22)
    table.add_column("PID/PROCESS", style="white")
    table.add_column("SECURITY STATUS & GEOIP", style="bright_blue")

    conns_sorted = sorted(conns, key=lambda x: (x["state"] != "ESTABLISHED", x["state"]))

    for c in conns_sorted[:25]:  # show more rows
        remote_display = f"[bold]{c['domain']}[/bold]\n{c['remote_ip']}:{c['remote_port']}" if c['domain'] else f"{c['remote_ip']}:{c['remote_port']}"
        
        # Color coding based on state
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

    # FOOTER ALERTS & METRICS
    alerts_text = "\n".join(alerts[:6]) if alerts else "[green]✅ No active threats detected[/green]"
    
    # Calculate some quick stats
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
