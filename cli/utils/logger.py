"""
Logger Utility - Clean log-style output
"""

from datetime import datetime


def _timestamp():
    """Get current timestamp"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def log_info(message):
    """Log info message"""
    print(f"[{_timestamp()}] INFO: {message}")


def log_warn(message):
    """Log warning message"""
    print(f"[{_timestamp()}] WARN: {message}")


def log_error(message):
    """Log error message"""
    print(f"[{_timestamp()}] ERROR: {message}")


def log_action(message):
    """Log action message"""
    print(f"[{_timestamp()}] ACTION: {message}")


def log_debug(message):
    """Log debug message"""
    print(f"[{_timestamp()}] DEBUG: {message}")
