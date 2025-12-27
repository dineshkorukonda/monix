import socket
import struct

TCP_STATES = {
    "01": "ESTABLISHED",
    "02": "SYN_SENT",
    "03": "SYN_RECV",
    "04": "FIN_WAIT1",
    "05": "FIN_WAIT2",
    "06": "TIME_WAIT",
    "07": "CLOSE",
    "08": "CLOSE_WAIT",
    "09": "LAST_ACK",
    "0A": "LISTEN",
    "0B": "CLOSING",
}

def hex_ip(h):
    if len(h) == 8:
        return socket.inet_ntoa(struct.pack("<L", int(h, 16)))
    else:
        addr_bytes = struct.pack(
            "<IIII",
            int(h[0:8], 16),
            int(h[8:16], 16),
            int(h[16:24], 16),
            int(h[24:32], 16)
        )
        return socket.inet_ntop(socket.AF_INET6, addr_bytes)

def hex_port(h):
    return int(h, 16)
