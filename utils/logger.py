from datetime import datetime

class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    BRIGHT_RED = "\033[91m"
    BRIGHT_GREEN = "\033[92m"
    BRIGHT_YELLOW = "\033[93m"
    BRIGHT_BLUE = "\033[94m"
    BRIGHT_MAGENTA = "\033[95m"
    BRIGHT_CYAN = "\033[96m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"

C = Colors

def _timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log_info(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.CYAN}INFO:{C.RESET}"
    print(f"{ts} {label} {message}")

def log_warn(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.YELLOW}{C.BOLD}WARN:{C.RESET}"
    print(f"{ts} {label} {C.YELLOW}{message}{C.RESET}")

def log_error(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.RED}{C.BOLD}ERROR:{C.RESET}"
    print(f"{ts} {label} {C.RED}{message}{C.RESET}")

def log_action(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.GREEN}{C.BOLD}ACTION:{C.RESET}"
    print(f"{ts} {label} {C.GREEN}{message}{C.RESET}")

def log_debug(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.DIM}DEBUG:{C.RESET}"
    print(f"{ts} {label} {C.DIM}{message}{C.RESET}")

def log_success(message):
    ts = f"{C.DIM}[{_timestamp()}]{C.RESET}"
    label = f"{C.BRIGHT_GREEN}{C.BOLD}OK:{C.RESET}"
    print(f"{ts} {label} {C.BRIGHT_GREEN}{message}{C.RESET}")

def header(text):
    print(f"\n{C.BOLD}{C.CYAN}{text}{C.RESET}")
    print(f"{C.DIM}{'─' * len(text)}{C.RESET}")

def divider(char="─", length=50):
    print(f"{C.DIM}{char * length}{C.RESET}")
