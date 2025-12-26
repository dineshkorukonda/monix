import requests

geo_cache = {}

def geo_lookup(ip):
    if ip.startswith("127.") or ip == "0.0.0.0" or ip == "::1" or ip == "::":
        return ""

    if ip in geo_cache:
        return geo_cache[ip]

    try:
        url = f"https://ipinfo.io/{ip}/json" if ip else "https://ipinfo.io/json"
        res = requests.get(url, timeout=1).json()
        info = f"{res.get('city', '')}, {res.get('country', '')} | {res.get('org', '')}"
        if ip:
            geo_cache[ip] = info
        return info
    except:
        return ""


def get_my_location():
    try:
        res = requests.get("https://ipinfo.io/json", timeout=1).json()
        return f"{res.get('city', '')}, {res.get('country', '')}"
    except:
        return "Unknown Location"

