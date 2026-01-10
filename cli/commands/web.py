"""
Web interface launcher command for Monix.

This command starts the Monix web interface by:
1. Starting the Flask API server
2. Opening the web interface in the default browser
3. Optionally starting the Next.js dev server if needed

Technical Rationale:
    Providing a unified CLI command to launch the web interface improves
    user experience and ensures proper initialization of all services.
"""

import os
import sys
import socket
import webbrowser
import subprocess
import time
from threading import Thread
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns
from rich.text import Text
from rich.live import Live
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logger import Colors as C
from core.scanners.web import analyze_web_security

console = Console()

def run_analysis(url: str):
    """
    Perform and display web security analysis in the terminal.
    """
    console.print(Panel(
        Text(f"MONIX WEB ANALYSIS: {url}", style="bold white", justify="center"),
        border_style="white",
        padding=(1, 2)
    ))

    with Progress(
        SpinnerColumn(style="white"),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=None, style="dim white", complete_style="white"),
        TaskProgressColumn(),
        console=console
    ) as progress:
        task = progress.add_task("EXECUTING_SCAN...", total=100)
        
        # Simulate progress for better UX
        import time
        for i in range(4):
            time.sleep(0.3)
            progress.update(task, advance=15)
            
        try:
            result = analyze_web_security(url)
            progress.update(task, completed=100)
        except Exception as e:
            console.print(f"\n[bold red]CRITICAL_FAILURE: {str(e)}[/bold red]")
            return

    if result.get("status") == "error":
        console.print(f"\n[bold red]ANALYSIS_FAILED: {result.get('error')}[/bold red]")
        return

    # --- Summary Bar ---
    threat_level = result.get("threat_level", "UNKNOWN")
    threat_score = result.get("threat_score", 0)
    threat_color = "red" if threat_score >= 50 else "yellow" if threat_score >= 30 else "cyan" if threat_score >= 15 else "white"

    summary_table = Table(show_header=False, box=None, padding=(0, 2))
    summary_table.add_row(
        Panel(f"[bold {threat_color}]{threat_level}[/bold {threat_color}]\n[dim white]{threat_score}%[/dim white]", title="[01] STATUS", border_style="dim white"),
        Panel(f"[bold white]{result.get('ip_address', '---')}[/bold white]", title="[02] TARGET_IP", border_style="dim white"),
        Panel(f"[bold white]{result.get('technologies', {}).get('server', 'UNKNOWN')}[/bold white]", title="[03] INFRA", border_style="dim white"),
        Panel(f"[bold white]{'VALID' if result.get('ssl_certificate', {}).get('valid') else 'INVALID'}[/bold white]", title="[04] SSL", border_style="dim white")
    )
    console.print(summary_table)

    # --- Content Grid ---
    # Row 1: Geo and Hardening
    row1 = Table(show_header=False, box=None, padding=(0, 1), expand=True)
    
    # Geo Info
    loc = result.get("server_location", {})
    geo_text = Text()
    geo_text.append(f"PROVIDER: {loc.get('org', '---')}\n", style="white")
    geo_text.append(f"LOCATION: {loc.get('city', '')}, {loc.get('region', '')}\n", style="white")
    geo_text.append(f"TIMEZONE: {loc.get('timezone', '---')}\n", style="white")
    if loc.get('coordinates'):
        geo_text.append(f"COORDS:   {loc['coordinates']['latitude']}, {loc['coordinates']['longitude']}", style="white")
    
    geo_panel = Panel(geo_text, title="GEO_INTEL", border_style="dim white", expand=True)
    
    # Hardening (Security Headers)
    hardening = result.get("security_headers_analysis", {})
    hardening_text = Text()
    hardening_text.append(f"SCORE: {hardening.get('percentage', 0)}% SECURED\n\n", style="bold white")
    
    for header, data in list(hardening.get('headers', {}).items())[:5]:
        status = "[+]" if data.get('present') else "[-]"
        color = "white" if data.get('present') else "dim white"
        hardening_text.append(f"{status} {header[:25]:<25}\n", style=color)
        
    hardening_panel = Panel(hardening_text, title="HARDENING", border_style="dim white", expand=True)
    
    row1.add_row(geo_panel, hardening_panel)
    console.print(row1)

    # Row 2: Tech Stack and DNS
    row2 = Table(show_header=False, box=None, padding=(0, 1), expand=True)
    
    # Tech Stack
    tech = result.get("technologies", {})
    tech_text = Text()
    tech_text.append(f"SERVER: {tech.get('server', '---')}\n", style="white")
    tech_text.append(f"CMS:    {tech.get('cms', '---')}\n", style="white")
    tech_text.append(f"CDN:    {tech.get('cdn', '---')}\n", style="white")
    if tech.get('languages'):
        tech_text.append(f"LANGS:  {', '.join(tech['languages'])}", style="white")
    
    tech_panel = Panel(tech_text, title="TECH_STACK", border_style="dim white", expand=True)
    
    # DNS Map
    dns = result.get("dns_records", {})
    dns_text = Text()
    if dns.get('a'):
        dns_text.append("A_RECORDS:\n", style="dim white")
        for a in dns['a'][:2]:
            dns_text.append(f"  {a}\n", style="white")
    if dns.get('ns'):
        dns_text.append("NS_RECORDS:\n", style="dim white")
        for ns in dns['ns'][:2]:
            dns_text.append(f"  {ns}\n", style="white")
            
    dns_panel = Panel(dns_text, title="DNS_MAP", border_style="dim white", expand=True)
    
    row2.add_row(tech_panel, dns_panel)
    console.print(row2)

    # Threats if any
    if result.get("threats"):
        threat_text = Text()
        for threat in result["threats"]:
            threat_text.append(f"! {threat}\n", style=f"bold {threat_color}")
        console.print(Panel(threat_text, title="THREAT_VECTORS", border_style=threat_color))

def run(port: int = 3030, nextjs_port: int = 3500, auto_open: bool = True):
    """Get the local IP address of the machine."""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def check_port_available(port: int) -> bool:
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def check_flask_installed() -> bool:
    """Check if Flask is installed."""
    try:
        import flask
        return True
    except ImportError:
        return False


def start_api_server(port: int = 3030) -> Thread:
    """Start the Flask API server in a background thread."""
    def run_server():
        try:
            if not check_flask_installed():
                print(f"{C.RED}Error: Flask is not installed.{C.RESET}")
                print(f"{C.YELLOW}Please install dependencies: pip install -r requirements.txt{C.RESET}")
                return
            
            # Import here to avoid circular imports
            from api.server import app
            app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
        except ImportError as e:
            print(f"{C.RED}Error: Missing dependency - {e}{C.RESET}")
            print(f"{C.YELLOW}Please install dependencies: pip install -r requirements.txt{C.RESET}")
        except Exception as e:
            print(f"{C.RED}Error starting API server: {e}{C.RESET}")
    
    thread = Thread(target=run_server, daemon=True)
    thread.start()
    return thread


def check_port_in_use(port: int) -> bool:
    """Check if a port is in use (opposite of check_port_available)."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect(("127.0.0.1", port))
            return True
        except (ConnectionRefusedError, OSError):
            return False


def start_nextjs_server(port: int = 3500) -> subprocess.Popen:
    """Start the Next.js development server."""
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "web")
    
    if not os.path.exists(web_dir):
        print(f"{C.YELLOW}Warning: Next.js app directory not found at {web_dir}{C.RESET}")
        return None
    
    # Check if node_modules exists
    node_modules = os.path.join(web_dir, "node_modules")
    package_json = os.path.join(web_dir, "package.json")
    
    if not os.path.exists(package_json):
        print(f"{C.RED}Error: package.json not found in {web_dir}{C.RESET}")
        return None
    
    if not os.path.exists(node_modules):
        print(f"{C.YELLOW}Installing Next.js dependencies (this may take a minute)...{C.RESET}")
        try:
            result = subprocess.run(
                ["npm", "install"],
                cwd=web_dir,
                check=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            print(f"{C.GREEN}Dependencies installed successfully{C.RESET}")
        except subprocess.CalledProcessError as e:
            print(f"{C.RED}Error installing dependencies:{C.RESET}")
            print(e.stdout if hasattr(e, 'stdout') else str(e))
            print(f"{C.YELLOW}Please run 'npm install' manually in {web_dir}{C.RESET}")
            return None
        except FileNotFoundError:
            print(f"{C.RED}Error: npm not found. Please install Node.js and npm.{C.RESET}")
            return None
    
    # Start Next.js server
    # IMPORTANT: Use -H 0.0.0.0 to bind to all network interfaces
    # This makes the server accessible from other machines via IP address
    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HOSTNAME"] = "0.0.0.0"
    
    try:
        # Next.js dev server with hostname and port flags
        # -H 0.0.0.0 binds to all network interfaces (accessible from IP)
        # -p sets the port
        process = subprocess.Popen(
            ["npx", "next", "dev", "-H", "0.0.0.0", "-p", str(port)],
            cwd=web_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return process
    except FileNotFoundError:
        # Fallback to npm run dev if npx not available
        try:
            process = subprocess.Popen(
                ["npm", "run", "dev", "--", "-H", "0.0.0.0", "-p", str(port)],
                cwd=web_dir,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            return process
        except Exception as e:
            print(f"{C.RED}Error starting Next.js server: {e}{C.RESET}")
            return None
    except Exception as e:
        print(f"{C.RED}Error starting Next.js server: {e}{C.RESET}")
        return None


def run(port: int = 3030, nextjs_port: int = 3500, auto_open: bool = True):
    """
    Launch the Monix web interface.
    
    Args:
        port: Port for the Flask API server (default: 3030)
        nextjs_port: Port for the Next.js frontend (default: 3500)
        auto_open: Whether to automatically open the browser
    """
    print(f"{C.CYAN}Monix Web Interface{C.RESET}")
    print(f"{C.DIM}{'=' * 50}{C.RESET}")
    
    # Check if Flask is installed
    if not check_flask_installed():
        print(f"{C.RED}Error: Flask is not installed.{C.RESET}")
        print(f"{C.YELLOW}Please install dependencies:{C.RESET}")
        print(f"{C.CYAN}  pip install -r requirements.txt{C.RESET}")
        sys.exit(1)
    
    # Check if API port is available
    api_running = check_port_in_use(port)
    if api_running:
        print(f"{C.YELLOW}API server already running on port {port}{C.RESET}")
    else:
        print(f"{C.GREEN}Starting API server on port {port}...{C.RESET}")
        api_thread = start_api_server(port)
        time.sleep(3)  # Give server time to start
    
    # Check if Next.js is already running
    nextjs_running = check_port_in_use(nextjs_port)
    nextjs_process = None
    
    if nextjs_running:
        print(f"{C.YELLOW}Next.js server already running on port {nextjs_port}{C.RESET}")
    else:
        print(f"{C.GREEN}Starting Next.js server on port {nextjs_port} (binding to 0.0.0.0)...{C.RESET}")
        nextjs_process = start_nextjs_server(nextjs_port)
        if nextjs_process:
            time.sleep(5)  # Give Next.js time to start
    
    # Get local IP
    local_ip = get_local_ip()
    
    # Determine web URL
    web_url = f"http://{local_ip}:{nextjs_port}/monix"
    api_url = f"http://{local_ip}:{port}"
    
    print(f"{C.DIM}{'=' * 50}{C.RESET}")
    print(f"{C.GREEN}API Server: {C.BOLD}{api_url}{C.RESET}")
    print(f"{C.GREEN}Web Interface: {C.BOLD}{web_url}{C.RESET}")
    print(f"{C.DIM}{'=' * 50}{C.RESET}")
    print(f"{C.CYAN}Press Ctrl+C to stop{C.RESET}")
    
    # Open browser if requested
    if auto_open:
        try:
            time.sleep(2)  # Give servers a moment to be ready
            webbrowser.open(web_url)
            print(f"{C.GREEN}Opened browser to {web_url}{C.RESET}")
        except Exception as e:
            print(f"{C.YELLOW}Could not open browser automatically: {e}{C.RESET}")
            print(f"{C.CYAN}Please open {web_url} manually{C.RESET}")
    
    # Keep the process alive
    try:
        while True:
            time.sleep(1)
            # Check if Next.js process is still alive
            if nextjs_process and nextjs_process.poll() is not None:
                print(f"{C.RED}Next.js server stopped unexpectedly{C.RESET}")
                break
    except KeyboardInterrupt:
        print(f"\n{C.YELLOW}Shutting down...{C.RESET}")
        if nextjs_process:
            nextjs_process.terminate()
            try:
                nextjs_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                nextjs_process.kill()
        sys.exit(0)
