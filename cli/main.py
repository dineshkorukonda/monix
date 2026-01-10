#!/usr/bin/env python3

import click
from cli import __version__
from cli.commands import monitor, status, watch, connections, alerts, scan, traffic, web

@click.group(invoke_without_command=True)
@click.option('--version', '-v', is_flag=True, help='Show version information')
@click.option('--monitor', '-m', 'run_monitor', is_flag=True, help='Quick system snapshot')
@click.option('--status', '-s', 'run_status', is_flag=True, help='One-line health check')
@click.option('--watch', 'run_watch', is_flag=True, help='Live security dashboard')
@click.option('--connections', '-c', 'run_connections', is_flag=True, help='List active connections')
@click.option('--alerts', '-a', 'run_alerts', is_flag=True, help='Show security alerts')
@click.option('--scan', 'run_scan', is_flag=True, help='Quick security scan')
@click.option('--traffic', '-t', 'run_traffic', is_flag=True, help='Analyze suspicious web traffic')
@click.option('--web', 'run_web', is_flag=True, help='Open web interface')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
@click.pass_context
def cli(ctx, version, run_monitor, run_status, run_watch, run_connections, run_alerts, run_scan, run_traffic, run_web, output_json):
    if version:
        click.echo(f"monix v{__version__}")
        return
    
    if run_monitor:
        monitor.run(output_json=output_json)
        return
    
    if run_status:
        status.run()
        return
    
    if run_watch:
        watch.run()
        return
    
    if run_connections:
        connections.run(output_json=output_json)
        return
    
    if run_alerts:
        alerts.run()
        return
    
    if run_scan:
        scan.run()
        return
    
    if run_traffic:
        traffic.run(output_json=output_json)
        return
    
    if run_web:
        web.run()
        return
    
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())

@cli.command('monitor')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
def monitor_cmd(output_json):
    monitor.run(output_json=output_json)

@cli.command('status')
def status_cmd():
    status.run()

@cli.command('watch')
@click.option('--refresh', '-r', default=3, help='Refresh interval in seconds')
def watch_cmd(refresh):
    watch.run(refresh_interval=refresh)

@cli.command('connections')
@click.option('--state', '-s', help='Filter by state (ESTABLISHED, LISTEN, etc.)')
@click.option('--limit', '-l', default=20, help='Number of connections to show')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
def connections_cmd(state, limit, output_json):
    connections.run(state_filter=state, limit=limit, output_json=output_json)

@cli.command('alerts')
@click.option('--limit', '-l', default=10, help='Number of alerts to show')
def alerts_cmd(limit):
    alerts.run(limit=limit)

@cli.command('scan')
@click.option('--deep', is_flag=True, help='Perform deep security scan')
def scan_cmd(deep):
    scan.run(deep=deep)

@cli.command('traffic')
@click.option('--log', '-l', default='/var/log/nginx/access.log', help='Path to Nginx access log')
@click.option('--window', '-w', default=10, help='Time window in minutes (default: 10)')
@click.option('--limit', default=15, help='Max number of IPs to display')
@click.option('--json', 'output_json', is_flag=True, help='Output in JSON format')
def traffic_cmd(log, window, limit, output_json):
    traffic.run(log_path=log, window=window, limit=limit, output_json=output_json)

@cli.command('web')
@click.argument('url', required=False)
@click.option('--port', '-p', default=3030, help='API server port (default: 3030)')
@click.option('--nextjs-port', '-n', default=3500, help='Next.js frontend port (default: 3500)')
@click.option('--no-open', is_flag=True, help='Do not open browser automatically')
def web_cmd(url, port, nextjs_port, no_open):
    if url:
        web.run_analysis(url)
    else:
        web.run(port=port, nextjs_port=nextjs_port, auto_open=not no_open)

def monix_web_main():
    """Standalone entry point for monix-web <url>"""
    import sys
    # Handle the case where someone might pass arguments
    if len(sys.argv) > 1:
        url = sys.argv[1]
        # If it looks like an option, just run the default web command
        if url.startswith('-'):
            from cli.commands import web
            web.run()
        else:
            from cli.commands import web
            web.run_analysis(url)
    else:
        from cli.commands import web
        web.run()

def main():
    cli()

if __name__ == '__main__':
    main()
