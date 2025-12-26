import psutil

def get_process_map():
    """
    Returns a map of (local_ip, local_port) -> (pid, pname)
    """
    process_map = {}
    try:
        # Get all TCP connections
        for c in psutil.net_connections(kind="tcp"):
            if c.laddr and c.pid:
                try:
                    p = psutil.Process(c.pid)
                    # Use (ip, port) as key. This works for both established and listening
                    process_map[(c.laddr.ip, c.laddr.port)] = (c.pid, p.name())
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
    except Exception:
        pass
    return process_map
