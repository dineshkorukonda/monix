#!/usr/bin/env python3
"""
Main CLI entry point for Monarx Sentinel
"""

import click
from cli import __version__
from cli.commands import monitor, status, watch, connections, alerts, scan


@click.group(invoke_without_command=True)
@click.option('--version', '-v', is_flag=True, help='Show version information')
@click.pass_context
def cli(ctx, version):
    """
    🛡️ Monarx Sentinel - Next-Gen Intrusion Monitoring & Defense
    
    Real-time threat monitoring, connection intelligence, and 
    behavior-based attack detection for Linux servers.
    
    \b
    Quick Start:
      monarx-sentinel --monitor     Quick system snapshot
      monarx-sentinel --watch       Live dashboard
      monarx-sentinel --status      One-line health check
    """
    if version:
        click.echo(f"Monarx Sentinel v{__version__}")
        return
    
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


# Register commands as options for convenience
@cli.command('monitor')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
def monitor_cmd(output_json):
    """📊 Quick snapshot of system status"""
    monitor.run(output_json=output_json)


@cli.command('status')
def status_cmd():
    """✅ One-line health check"""
    status.run()


@cli.command('watch')
@click.option('--refresh', '-r', default=3, help='Refresh interval in seconds')
def watch_cmd(refresh):
    """👁️ Live security dashboard"""
    watch.run(refresh_interval=refresh)


@cli.command('connections')
@click.option('--state', '-s', help='Filter by state (ESTABLISHED, LISTEN, etc.)')
@click.option('--limit', '-l', default=20, help='Number of connections to show')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
def connections_cmd(state, limit, output_json):
    """🔗 List active connections"""
    connections.run(state_filter=state, limit=limit, output_json=output_json)


@cli.command('alerts')
@click.option('--limit', '-l', default=10, help='Number of alerts to show')
def alerts_cmd(limit):
    """🚨 Show recent security alerts"""
    alerts.run(limit=limit)


@cli.command('scan')
@click.option('--deep', is_flag=True, help='Perform deep security scan')
def scan_cmd(deep):
    """🔍 Quick security scan"""
    scan.run(deep=deep)


def main():
    """Entry point for the CLI"""
    cli()


if __name__ == '__main__':
    main()
