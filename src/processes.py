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
                    pname = p.name()
                    
                    # Enhance process names for common interpreters
                    if pname.lower() in ["node", "python", "python3", "php", "ruby"]:
                        try:
                            cmdline = p.cmdline()
                            if cmdline and len(cmdline) > 1:
                                # Try to find the script name in the cmdline
                                for arg in cmdline[1:]:
                                    if "/" in arg or arg.endswith((".js", ".py", ".php", ".rb")):
                                        script_name = arg.split("/")[-1]
                                        pname = f"{pname}:{script_name}"
                                        break
                        except (psutil.AccessDenied, psutil.NoSuchProcess):
                            pass
                    
                    # Use (ip, port) as key. This works for both established and listening
                    process_map[(c.laddr.ip, c.laddr.port)] = (c.pid, pname)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
    except Exception:
        pass
    return process_map
