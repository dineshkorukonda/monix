"""
CLI web security analysis command for Monix.

This command performs URL security analysis from the terminal.
It uses the monix-engine analysis engine but does NOT start any web servers.

Note: The monix-web Next.js application is a separate, independently
deployed product that uses monix-engine. It is NOT started from this CLI.

Technical Rationale:
    CLI-based URL analysis provides quick security checks without requiring
    a web interface. The web dashboard is a separate product.
"""

import os
import sys
import socket
import webbrowser
import subprocess
import time
from datetime import datetime
from threading import Thread

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logger import Colors as C, log_info, log_error, log_success
from engine.scanners.web import analyze_web_security

def run_analysis(url: str):
    """
    Perform and display web security analysis in the terminal (compact version).
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    log_info(f"Analyzing target: {url}")
    
    try:
        # Simple progress indicator
        print(f"  {C.DIM}Executing scan...{C.RESET}", end="\r")
        result = analyze_web_security(url)
        print(" " * 30, end="\r") # Clear the line
    except Exception as e:
        log_error(f"CRITICAL_FAILURE: {str(e)}")
        return

    if result.get("status") == "error":
        log_error(f"ANALYSIS_FAILED: {result.get('error')}")
        return

    # --- Summary Header ---
    threat_level = result.get("threat_level", "UNKNOWN")
    threat_score = result.get("threat_score", 0)
    
    if threat_score >= 50:
        threat_display = f"{C.RED}{C.BOLD}{threat_level}{C.RESET}"
    elif threat_score >= 30:
        threat_display = f"{C.YELLOW}{threat_level}{C.RESET}"
    elif threat_score >= 15:
        threat_display = f"{C.CYAN}{threat_level}{C.RESET}"
    else:
        threat_display = f"{C.WHITE}{threat_level}{C.RESET}"

    ssl_valid = result.get("ssl_certificate", {}).get("valid")
    ssl_status = f"{C.GREEN}VALID{C.RESET}" if ssl_valid else f"{C.RED}INVALID/NONE{C.RESET}"

    print(f"{C.DIM}[{timestamp}]{C.RESET} {C.BOLD}Web Analysis Result{C.RESET}")
    print(f"{C.DIM}{'─' * 60}{C.RESET}")
    print(f"  {C.DIM}Status:{C.RESET}       {threat_display} {C.DIM}({threat_score}%){C.RESET}")
    print(f"  {C.DIM}Target IP:{C.RESET}    {C.WHITE}{result.get('ip_address', '---')}{C.RESET}")
    print(f"  {C.DIM}Infra:{C.RESET}        {C.WHITE}{result.get('technologies', {}).get('server', '---')}{C.RESET}")
    print(f"  {C.DIM}SSL:{C.RESET}          {ssl_status}")
    print()

    # Geo Intel
    loc = result.get("server_location", {})
    provider = loc.get('org', '---')
    city = loc.get('city', '')
    region = loc.get('region', '')
    location = f"{city}, {region}" if city and region else city or region or "---"
    print(f"  {C.BOLD}Geo Intel:{C.RESET}    {C.WHITE}{provider}{C.RESET} {C.DIM}({location}){C.RESET}")

    # Hardening
    hardening = result.get("security_headers_analysis", {})
    h_score = hardening.get('percentage', 0)
    h_color = C.GREEN if h_score >= 70 else C.YELLOW if h_score >= 40 else C.RED
    print(f"  {C.BOLD}Hardening:{C.RESET}    {h_color}{h_score}% Secured{C.RESET}")

    # Tech Stack
    tech = result.get("technologies", {})
    tech_list = []
    if tech.get('server'): tech_list.append(tech['server'])
    if tech.get('cms'): tech_list.append(tech['cms'])
    if tech.get('cdn'): tech_list.append(tech['cdn'])
    tech_list.extend(tech.get('languages', []))
    print(f"  {C.BOLD}Tech Stack:{C.RESET}   {C.WHITE}{', '.join(tech_list) if tech_list else '---'}{C.RESET}")

    # DNS
    dns = result.get("dns_records", {})
    a_records = dns.get('a', [])
    print(f"  {C.BOLD}DNS Records:{C.RESET}  {C.DIM}{', '.join(a_records[:3]) if a_records else '---'}{C.RESET}")

    # Threats
    if result.get("threats"):
        print()
        print(f"  {C.RED}⚠ THREATS DETECTED:{C.RESET}")
        for threat in result["threats"]:
            print(f"    {C.RED}• {threat}{C.RESET}")

    print(f"{C.DIM}{'─' * 60}{C.RESET}")
    print()

def get_local_ip() -> str:
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


# NOTE: This function is commented out because monix-web is a separate,
# independently deployed Next.js application. The CLI tool (monix-cli)
# should NOT start web servers. This code is kept for reference only.
#
# def run(port: int = 3030, nextjs_port: int = 3500, auto_open: bool = True):
#     """
#     [DISABLED] Launch the Monix web interface.
#     
#     This function is disabled because monix-web is a separate product.
#     The web dashboard should be deployed independently, not started from CLI.
#     """
#     print(f"{C.RED}ERROR: Web interface launcher is disabled.{C.RESET}")
#     print(f"{C.YELLOW}monix-web is a separate, independently deployed product.{C.RESET}")
#     print(f"{C.CYAN}Use 'monix-cli web <url>' for CLI URL analysis instead.{C.RESET}")
#     sys.exit(1)
