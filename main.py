#!/usr/bin/env python3

from src.monitor import start_monitor
from src.ui import start_ui

def main():
    print("Starting Monarx servers Monitor...")
    start_monitor()
    start_ui()

if __name__ == "__main__":
    main()
