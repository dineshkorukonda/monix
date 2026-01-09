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

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logger import Colors as C


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


def start_api_server(port: int = 3030) -> Thread:
    """Start the Flask API server in a background thread."""
    def run_server():
        try:
            # Import here to avoid circular imports
            from api.server import app
            app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
        except Exception as e:
            print(f"{C.RED}Error starting API server: {e}{C.RESET}")
    
    thread = Thread(target=run_server, daemon=True)
    thread.start()
    return thread


def run(port: int = 3030, nextjs_port: int = 3000, auto_open: bool = True):
    """
    Launch the Monix web interface.
    
    Args:
        port: Port for the Flask API server (default: 3030)
        nextjs_port: Port for the Next.js frontend (default: 3000)
        auto_open: Whether to automatically open the browser
    """
    print(f"{C.CYAN}Monix Web Interface{C.RESET}")
    print(f"{C.DIM}{'=' * 50}{C.RESET}")
    
    # Check if API port is available
    if not check_port_available(port):
        print(f"{C.YELLOW}Warning: Port {port} is already in use. Attempting to use existing server.{C.RESET}")
    else:
        print(f"{C.GREEN}Starting API server on port {port}...{C.RESET}")
        api_thread = start_api_server(port)
        time.sleep(2)  # Give server time to start
    
    # Get local IP
    local_ip = get_local_ip()
    
    # Determine web URL
    # Check if Next.js is running
    web_url = f"http://{local_ip}:{nextjs_port}/monix"
    api_url = f"http://{local_ip}:{port}"
    
    print(f"{C.GREEN}API Server: {C.BOLD}{api_url}{C.RESET}")
    print(f"{C.GREEN}Web Interface: {C.BOLD}{web_url}{C.RESET}")
    print(f"{C.DIM}{'=' * 50}{C.RESET}")
    print(f"{C.CYAN}Press Ctrl+C to stop{C.RESET}")
    
    # Open browser if requested
    if auto_open:
        try:
            time.sleep(1)  # Give server a moment to be ready
            webbrowser.open(web_url)
            print(f"{C.GREEN}Opened browser to {web_url}{C.RESET}")
        except Exception as e:
            print(f"{C.YELLOW}Could not open browser automatically: {e}{C.RESET}")
            print(f"{C.CYAN}Please open {web_url} manually{C.RESET}")
    
    # Keep the process alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{C.YELLOW}Shutting down...{C.RESET}")
        sys.exit(0)
