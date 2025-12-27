"""
Display Utilities - Formatting and visual helpers
"""


def get_threat_level(alerts_count):
    """
    Determine threat level based on alert count
    """
    if alerts_count == 0:
        return "secure"
    elif alerts_count <= 2:
        return "warning"
    else:
        return "critical"


def get_status_emoji(threat_level):
    """
    Get appropriate emoji for threat level
    """
    emojis = {
        "secure": "✅",
        "warning": "⚠️",
        "critical": "🚨"
    }
    return emojis.get(threat_level, "❓")


def format_bytes(bytes_value):
    """
    Format bytes to human readable format
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f} {unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f} PB"


def truncate(text, max_length=30):
    """
    Truncate text to max length with ellipsis
    """
    if not text:
        return ""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."


def colorize_state(state):
    """
    Return Rich color markup for connection state
    """
    colors = {
        "ESTABLISHED": "bold green",
        "LISTEN": "yellow",
        "TIME_WAIT": "dim",
        "CLOSE_WAIT": "dim",
        "FIN_WAIT1": "dim",
        "FIN_WAIT2": "dim",
        "SYN_SENT": "cyan",
        "SYN_RECV": "red",
        "CLOSING": "dim",
        "LAST_ACK": "dim",
    }
    return colors.get(state, "white")
