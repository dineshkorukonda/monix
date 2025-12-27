"""
Scan Command - Security scan
"""

import time
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.table import Table

from cli.core.collector import collect_connections
from cli.core.analyzer import analyze_connections, detect_threats
from cli.core.scanner import run_security_checks


console = Console()


def run(deep=False):
    """Execute the scan command"""
    
    console.print()
    console.print(Panel.fit(
        "[bold cyan]🔍 Monarx Security Scan[/bold cyan]",
        border_style="cyan"
    ))
    console.print()
    
    results = {}
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console
    ) as progress:
        
        # Basic checks
        task1 = progress.add_task("[cyan]Collecting connections...", total=None)
        connections = collect_connections()
        progress.update(task1, completed=True, description="[green]✓ Connections collected")
        
        task2 = progress.add_task("[cyan]Analyzing traffic patterns...", total=None)
        analysis = analyze_connections(connections)
        progress.update(task2, completed=True, description="[green]✓ Traffic analyzed")
        
        task3 = progress.add_task("[cyan]Detecting threats...", total=None)
        threats = detect_threats(connections)
        progress.update(task3, completed=True, description="[green]✓ Threat detection complete")
        
        if deep:
            task4 = progress.add_task("[cyan]Running deep security checks...", total=None)
            security_results = run_security_checks(connections)
            results["security_checks"] = security_results
            progress.update(task4, completed=True, description="[green]✓ Deep scan complete")
    
    console.print()
    
    # Results Summary
    summary_table = Table(show_header=False, box=None, padding=(0, 2))
    summary_table.add_column("Check", style="dim")
    summary_table.add_column("Status")
    
    # Connection Analysis
    summary_table.add_row(
        "Total Connections",
        f"[cyan]{analysis['total']}[/cyan]"
    )
    summary_table.add_row(
        "Established",
        f"[green]{analysis['established']}[/green]"
    )
    summary_table.add_row(
        "Listening Ports",
        f"[yellow]{analysis['listening']}[/yellow]"
    )
    
    # Threat Status
    if threats:
        summary_table.add_row(
            "Threats Detected",
            f"[bold red]{len(threats)}[/bold red]"
        )
    else:
        summary_table.add_row(
            "Threats Detected",
            "[bold green]0[/bold green]"
        )
    
    console.print(Panel(summary_table, title="[bold]Scan Results[/bold]", border_style="cyan"))
    
    # Show threats if any
    if threats:
        console.print()
        console.print("[bold red]⚠️ Threats Found:[/bold red]")
        for threat in threats[:10]:
            console.print(f"  [red]•[/red] {threat}")
    
    # Deep scan results
    if deep and "security_checks" in results:
        console.print()
        checks = results["security_checks"]
        
        checks_table = Table(
            title="[bold]Deep Security Checks[/bold]",
            show_header=True,
            header_style="bold cyan"
        )
        checks_table.add_column("Check", style="white")
        checks_table.add_column("Status")
        checks_table.add_column("Details", style="dim")
        
        for check in checks:
            status = "[green]PASS[/green]" if check["passed"] else "[red]FAIL[/red]"
            checks_table.add_row(check["name"], status, check.get("details", ""))
        
        console.print(checks_table)
    
    # Final verdict
    console.print()
    if threats:
        console.print(Panel(
            f"[bold red]🚨 {len(threats)} threat(s) detected![/bold red]\n"
            "[dim]Review the alerts above and take appropriate action.[/dim]",
            border_style="red"
        ))
    else:
        console.print(Panel(
            "[bold green]✅ No threats detected[/bold green]\n"
            "[dim]Your system appears to be secure.[/dim]",
            border_style="green"
        ))
    
    console.print()
