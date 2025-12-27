"""
Watch Command - Live security dashboard using Rich
Uses the original src/ui.py dashboard
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from cli.utils.logger import log_info


def run(refresh_interval=3):
    """Execute the watch command - starts the Rich dashboard"""
    
    log_info("Starting live dashboard... Press Ctrl+C to exit")
    
    # Import here to avoid circular imports
    from src.monitor import start_monitor
    from src.ui import start_ui
    
    # Start the background monitor thread
    start_monitor()
    
    # Start the Rich UI
    try:
        start_ui()
    except KeyboardInterrupt:
        log_info("Dashboard stopped.")
