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
    table = Table(show_header=True, header_style="bold yellow", border_style="bright_black")
    table.add_column("STATE", style="cyan", width=12)
    table.add_column("REMOTE", style="magenta", width=22)
    table.add_column("LOCAL", style="green", width=22)
    table.add_column("PID", style="white", width=6)
    table.add_column("PROCESS", style="white", width=12)
    table.add_column("GEOIP", style="bright_blue")

    conns_sorted = sorted(conns, key=lambda x: x["state"])

    for c in conns_sorted[:22]:  # show first 22, scrolling later
        table.add_row(
            c["state"],
            f"{c['remote_ip']}:{c['remote_port']}",
            f"{c['local_ip']}:{c['local_port']}",
            str(c['pid']),
            c['pname'],
            c["geo"]
        )

    layout["body"].update(table)

    # FOOTER ALERTS & METRICS
    alerts_text = "\n".join(alerts[:6]) if alerts else "No recent security alerts"
    footer = Panel(
        f"[bold red]Alerts:[/bold red]\n{alerts_text}",
        border_style="red"
    )
    layout["footer"].update(footer)

    return layout


def start_ui():
    with Live(refresh_per_second=0.3, screen=True) as live:
        while True:
            live.update(build_dashboard())
            time.sleep(3)
