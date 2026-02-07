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
    print("Monix - Intrusion Monitoring & Defense")
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
    print("  monix-cli --monitor      Quick system snapshot")
    print("  monix-cli --status       One-line health check")
    print("  monix-cli --watch        Live security dashboard")
    print("  monix-cli --connections  List active connections")
    print("  monix-cli --alerts       Show security alerts")
    print("  monix-cli --scan         Security scan")
    print()
    print("=" * 70)
    print()

def main():
    check_compatibility()

if __name__ == "__main__":
    main()
