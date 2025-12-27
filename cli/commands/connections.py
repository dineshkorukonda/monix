"""
Connections Command - List active connections
"""

import json
from rich.console import Console
from rich.table import Table

from cli.core.collector import collect_connections


console = Console()


def run(state_filter=None, limit=20, output_json=False):
    """Execute the connections command"""
    
    connections = collect_connections()
    
    # Filter by state if specified
    if state_filter:
        state_filter = state_filter.upper()
        connections = [c for c in connections if c["state"] == state_filter]
    
    # Limit results
    connections = connections[:limit]
    
    if output_json:
        console.print_json(json.dumps(connections, default=str))
        return
    
    if not connections:
        console.print("[yellow]No connections found matching criteria[/yellow]")
        return
    
    # Build table
    table = Table(
        title=f"[bold]Active Connections[/bold] [dim]({len(connections)} shown)[/dim]",
        show_header=True,
        header_style="bold cyan",
        border_style="dim"
    )
    
    table.add_column("STATE", style="cyan", width=12)
    table.add_column("LOCAL", style="green")
    table.add_column("REMOTE", style="magenta")
    table.add_column("PID", style="yellow", width=8)
    table.add_column("PROCESS", style="white")
    table.add_column("GEO", style="blue")
    
    for conn in connections:
        state_style = "cyan"
        if conn["state"] == "ESTABLISHED":
            state_style = "bold green"
        elif conn["state"] == "LISTEN":
            state_style = "yellow"
        elif "WAIT" in conn["state"]:
            state_style = "dim"
        
        table.add_row(
            f"[{state_style}]{conn['state']}[/{state_style}]",
            f"{conn['local_ip']}:{conn['local_port']}",
            f"{conn['remote_ip']}:{conn['remote_port']}",
            str(conn.get('pid', '-')),
            conn.get('pname', ''),
            (conn.get('geo', '') or '')[:30]
        )
    
    console.print()
    console.print(table)
    console.print()
