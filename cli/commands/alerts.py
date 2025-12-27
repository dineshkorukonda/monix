"""
Alerts Command - Show recent security alerts
"""

from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from cli.core.collector import collect_connections
from cli.core.analyzer import detect_threats


console = Console()


def run(limit=10):
    """Execute the alerts command"""
    
    connections = collect_connections()
    threats = detect_threats(connections)
    
    if not threats:
        console.print()
        console.print(Panel(
            "[bold green]✅ No security alerts[/bold green]\n\n"
            "[dim]Your system appears to be secure. No suspicious activity detected.[/dim]",
            title="[bold]Security Alerts[/bold]",
            border_style="green"
        ))
        console.print()
        return
    
    # Show alerts
    table = Table(
        title=f"[bold red]🚨 Security Alerts[/bold red] [dim]({len(threats)} detected)[/dim]",
        show_header=True,
        header_style="bold red",
        border_style="red"
    )
    
    table.add_column("TIME", style="dim", width=10)
    table.add_column("TYPE", style="yellow", width=15)
    table.add_column("DETAILS", style="white")
    
    now = datetime.now().strftime("%H:%M:%S")
    
    for threat in threats[:limit]:
        # Parse threat message
        if "SYN_FLOOD" in threat:
            alert_type = "SYN FLOOD"
        elif "PORT_SCAN" in threat:
            alert_type = "PORT SCAN"
        elif "HIGH_CONN" in threat:
            alert_type = "HIGH CONN"
        else:
            alert_type = "ALERT"
        
        table.add_row(now, f"[bold red]{alert_type}[/bold red]", threat)
    
    console.print()
    console.print(table)
    console.print()
    console.print("[dim]💡 Tip: Use 'monarx-sentinel scan --deep' for detailed analysis[/dim]")
    console.print()
