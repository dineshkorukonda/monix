#!/usr/bin/env python3

import sys
import os
import platform

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def check_compatibility():
    system = platform.system().lower()
    is_linux = system == 'linux'
    is_macos = system == 'darwin'
    
    print("=" * 70)
    print("Monarx Sentinel - Intrusion Monitoring & Defense")
    print("=" * 70)
    print()
    
    if is_linux:
        print("✓ Linux detected - Full functionality available")
    elif is_macos:
        print("⚠ macOS detected - Limited functionality (psutil only)")
    else:
        print("⚠ Unknown system - Limited functionality")
    
    print()
    print("Available Commands (after 'pip install -e .'):")
    print()
    print("  monarx-sentinel --monitor      Quick system snapshot")
    print("  monarx-sentinel --status       One-line health check")
    print("  monarx-sentinel --watch        Live security dashboard")
    print("  monarx-sentinel --connections  List active connections")
    print("  monarx-sentinel --alerts       Show security alerts")
    print("  monarx-sentinel --scan         Security scan")
    print()
    print("Or run dashboard directly:")
    print("  python app.py")
    print()
    print("=" * 70)
    print()

def main():
    check_compatibility()
    
    response = input("Start dashboard now? [Y/n]: ").strip().lower()
    
    if response and response not in ['y', 'yes', '']:
        print("Exiting. Use 'monarx-sentinel --watch' for dashboard.")
        return
    
    print()
    print("Starting dashboard... Press Ctrl+C to exit")
    print()
    
    from core.monitor import start_monitor
    from dashboard.ui import start_ui
    
    start_monitor()
    start_ui()

if __name__ == "__main__":
    main()

