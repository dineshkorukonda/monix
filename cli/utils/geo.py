"""
Geo Utilities - GeoIP lookups and DNS resolution
"""

import socket
import requests


# Caches for performance
_geo_cache = {}
_dns_cache = {}
_location_cache = {}


def reverse_dns(ip):
    """
    Perform reverse DNS lookup for an IP address
    """
    if ip in ["127.0.0.1", "0.0.0.0", "::1", "::"]:
        return ""
    
    if ip in _dns_cache:
        return _dns_cache[ip]
    
    try:
        hostname = socket.gethostbyaddr(ip)[0]
        _dns_cache[ip] = hostname
        return hostname
    except:
        _dns_cache[ip] = ""
        return ""


def geo_lookup(ip):
    """
    Lookup GeoIP information for an IP address
    """
    if not ip or ip.startswith("127.") or ip in ["0.0.0.0", "::1", "::"]:
        return ""
    
    if ip in _geo_cache:
        return _geo_cache[ip]
    
    try:
        url = f"https://ipinfo.io/{ip}/json"
        res = requests.get(url, timeout=1).json()
        
        city = res.get('city', '')
        country = res.get('country', '')
        org = res.get('org', '')
        
        info = f"{city}, {country}" if city else country
        if org:
            info += f" | {org}"
        
        _geo_cache[ip] = info
        return info
    except:
        _geo_cache[ip] = ""
        return ""


def get_my_location():
    """
    Get the current server's location
    """
    if "self" in _location_cache:
        return _location_cache["self"]
    
    try:
        res = requests.get("https://ipinfo.io/json", timeout=2).json()
        location = f"{res.get('city', 'Unknown')}, {res.get('country', '')}"
        _location_cache["self"] = location
        return location
    except:
        _location_cache["self"] = "Unknown Location"
        return "Unknown Location"


def get_ip_info(ip):
    """
    Get detailed info for an IP address
    """
    info = {
        "ip": ip,
        "geo": geo_lookup(ip),
        "hostname": reverse_dns(ip)
    }
    return info
