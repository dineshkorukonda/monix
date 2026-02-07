import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from utils.logger import log_info


def run(refresh_interval=3):
    log_info("Starting live dashboard... Press Ctrl+C to exit")
    
    from engine.monitoring.engine import start_monitor
    from cli.ui import start_ui
    
    start_monitor()
    
    try:
        start_ui()
    except KeyboardInterrupt:
        log_info("Dashboard stopped.")
