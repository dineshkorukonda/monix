import psutil

def get_process_map():
    process_map = {}
    try:
        for c in psutil.net_connections(kind="tcp"):
            if c.laddr and c.pid:
                try:
                    p = psutil.Process(c.pid)
                    pname = p.name()
                    
                    if pname.lower() in ["node", "python", "python3", "php", "ruby"]:
                        try:
                            cmdline = p.cmdline()
                            if cmdline and len(cmdline) > 1:
                                for arg in cmdline[1:]:
                                    if "/" in arg or arg.endswith((".js", ".py", ".php", ".rb")):
                                        script_name = arg.split("/")[-1]
                                        pname = f"{pname}:{script_name}"
                                        break
                        except (psutil.AccessDenied, psutil.NoSuchProcess):
                            pass
                    
                    process_map[(c.laddr.ip, c.laddr.port)] = (c.pid, pname)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
    except Exception:
        pass
    return process_map
