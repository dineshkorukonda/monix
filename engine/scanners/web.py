"""
Web security checker module for URL analysis.

This module provides comprehensive web security checks including:
- SSL/TLS certificate validation
- DNS record analysis
- HTTP headers security analysis
- Security.txt file detection
- Server location and geolocation
- Threat pattern detection

Technical Rationale:
    Web security analysis requires multiple layers of checks to assess
    the security posture of a website. This module consolidates various
    security checks while maintaining separation from UI concerns.
    
Performance Optimization:
    Uses ThreadPoolExecutor for parallel execution of independent checks,
    significantly reducing total analysis time from 60+ seconds to ~5-10 seconds.
"""

import socket
import ssl
import requests
from urllib.parse import urlparse
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache

from engine.analyzers.traffic import (
    is_suspicious_url,
    classify_threat_level
)

# Global configuration for scanner requests
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

# DNS resolver - optional dependency
try:
    import dns.resolver
    import dns.exception
    DNS_AVAILABLE = True
except ImportError:
    DNS_AVAILABLE = False


def check_ssl_certificate(url: str) -> Dict:
    """
    Check SSL/TLS certificate information for a URL.
    
    Args:
        url: URL to check (must be HTTPS)
        
    Returns:
        Dictionary with certificate details
    """
    result = {
        "valid": False,
        "subject": "",
        "issuer": "",
        "expires": None,
        "renewed": None,
        "serial_number": "",
        "fingerprint": "",
        "extended_key_usage": [],
        "error": None
    }
    
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            result["error"] = "URL must use HTTPS"
            return result
        
        hostname = parsed.netloc.split(":")[0]
        port = parsed.port or 443
        
        # Create SSL context
        context = ssl.create_default_context()
        
        with socket.create_connection((hostname, port), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                
                # Parse certificate
                result["valid"] = True
                # Subject and issuer format: [((key, value),), ...]
                subject_list = cert.get("subject", [])
                issuer_list = cert.get("issuer", [])
                
                # Convert to dict format - handle nested tuple structure
                def parse_name(name_list):
                    if not name_list:
                        return {}
                    result_dict = {}
                    for item in name_list:
                        if isinstance(item, tuple) and len(item) > 0:
                            if isinstance(item[0], tuple) and len(item[0]) == 2:
                                key, value = item[0]
                                result_dict[key] = value
                    return result_dict
                
                result["subject"] = parse_name(subject_list)
                result["issuer"] = parse_name(issuer_list)
                
                # Dates
                not_after = cert.get("notAfter", "")
                not_before = cert.get("notBefore", "")
                
                if not_after:
                    result["expires"] = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").isoformat()
                if not_before:
                    result["renewed"] = datetime.strptime(not_before, "%b %d %H:%M:%S %Y %Z").isoformat()
                
                # Serial number
                result["serial_number"] = cert.get("serialNumber", "")
                
                # Extended key usage
                try:
                    ext_key_usage = cert.get("extensions", [])
                    for ext in ext_key_usage:
                        if ext[0] == "extendedKeyUsage":
                            result["extended_key_usage"] = ext[1]
                except:
                    pass
                
    except socket.timeout:
        result["error"] = "Connection timeout"
    except socket.gaierror:
        result["error"] = "DNS resolution failed"
    except ssl.SSLError as e:
        result["error"] = f"SSL error: {str(e)}"
    except Exception as e:
        result["error"] = f"Error: {str(e)}"
    
    return result


def check_dns_records(domain: str) -> Dict:
    """
    Check DNS records for a domain.
    
    Args:
        domain: Domain name to check
        
    Returns:
        Dictionary with DNS record information
    """
    result = {
        "a": [],
        "aaaa": [],
        "cname": [],
        "mx": [],
        "ns": [],
        "txt": [],
        "error": None
    }
    
    if not DNS_AVAILABLE:
        result["error"] = "dnspython not installed. Install with: pip install dnspython"
        return result
    
    try:
        # A records
        try:
            answers = dns.resolver.resolve(domain, "A")
            result["a"] = [str(rdata) for rdata in answers]
        except:
            pass
        
        # AAAA records
        try:
            answers = dns.resolver.resolve(domain, "AAAA")
            result["aaaa"] = [str(rdata) for rdata in answers]
        except:
            pass
        
        # CNAME records
        try:
            answers = dns.resolver.resolve(domain, "CNAME")
            result["cname"] = [str(rdata) for rdata in answers]
        except:
            pass
        
        # MX records
        try:
            answers = dns.resolver.resolve(domain, "MX")
            result["mx"] = [str(rdata) for rdata in answers]
        except:
            pass
        
        # NS records
        try:
            answers = dns.resolver.resolve(domain, "NS")
            result["ns"] = [str(rdata) for rdata in answers]
        except:
            pass
        
        # TXT records
        try:
            answers = dns.resolver.resolve(domain, "TXT")
            result["txt"] = [str(rdata).strip('"') for rdata in answers]
        except:
            pass
            
    except Exception as e:
        result["error"] = str(e)
    
    return result


def check_http_headers(url: str) -> Dict:
    """
    Check HTTP security headers.
    
    Args:
        url: URL to check
        
    Returns:
        Dictionary with header information
    """
    result = {
        "headers": {},
        "security_headers": {},
        "error": None
    }
    
    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=5, allow_redirects=True, verify=True)
        result["headers"] = dict(response.headers)
        
        # Check for security headers
        security_headers = [
            "strict-transport-security",
            "x-frame-options",
            "x-content-type-options",
            "x-xss-protection",
            "content-security-policy",
            "referrer-policy",
            "permissions-policy"
        ]
        
        for header in security_headers:
            if header in response.headers:
                result["security_headers"][header] = response.headers[header]
            else:
                result["security_headers"][header] = None
                
    except requests.exceptions.RequestException as e:
        result["error"] = str(e)
    
    return result


def check_security_txt(url: str) -> Dict:
    """
    Check for security.txt file.
    
    Args:
        url: Base URL to check
        
    Returns:
        Dictionary with security.txt information
    """
    result = {
        "present": False,
        "content": "",
        "url": "",
        "error": None
    }
    
    try:
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        # Check /.well-known/security.txt
        security_txt_url = f"{base_url}/.well-known/security.txt"
        try:
            response = requests.get(security_txt_url, headers=DEFAULT_HEADERS, timeout=2, allow_redirects=True)
            if response.status_code == 200:
                result["present"] = True
                result["content"] = response.text
                result["url"] = security_txt_url
                return result
        except:
            pass
        
        # Check /security.txt as fallback
        security_txt_url = f"{base_url}/security.txt"
        try:
            response = requests.get(security_txt_url, headers=DEFAULT_HEADERS, timeout=2, allow_redirects=True)
            if response.status_code == 200:
                result["present"] = True
                result["content"] = response.text
                result["url"] = security_txt_url
        except:
            pass
            
    except Exception as e:
        result["error"] = str(e)
    
    return result


@lru_cache(maxsize=256)
def get_server_location(ip: str) -> Dict:
    """
    Get server location information from IP address.
    
    Args:
        ip: IP address
        
    Returns:
        Dictionary with location information
    """
    result = {
        "ip": ip,
        "city": "",
        "country": "",
        "country_code": "",
        "region": "",
        "timezone": "",
        "coordinates": None,
        "org": "",
        "error": None
    }
    
    try:
        response = requests.get(f"https://ipinfo.io/{ip}/json", timeout=2)
        data = response.json()
        
        result["city"] = data.get("city", "")
        result["country"] = data.get("country", "")
        result["country_code"] = data.get("country", "")
        result["region"] = data.get("region", "")
        result["timezone"] = data.get("timezone", "")
        result["org"] = data.get("org", "")
        
        # Parse coordinates
        loc = data.get("loc", "")
        if loc:
            try:
                lat, lon = map(float, loc.split(","))
                result["coordinates"] = {"latitude": lat, "longitude": lon}
            except:
                pass
                
    except Exception as e:
        result["error"] = str(e)
    
    return result


def _check_single_port(host: str, port: int, timeout: float = 0.3) -> Tuple[int, str]:
    """
    Check if a single port is open.
    
    Args:
        host: Hostname or IP address
        port: Port number to check
        timeout: Connection timeout in seconds
        
    Returns:
        Tuple of (port, status) where status is 'open', 'closed', or 'filtered'
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result_code = sock.connect_ex((host, port))
        sock.close()
        
        if result_code == 0:
            return (port, "open")
        else:
            return (port, "closed")
    except socket.gaierror:
        raise
    except Exception:
        return (port, "filtered")


def scan_ports(host: str, ports: List[int] = None, full_scan: bool = False) -> Dict:
    """
    Scan common ports on a host using concurrent execution.
    
    Args:
        host: Hostname or IP address
        ports: List of ports to scan (defaults to essential web ports)
        full_scan: If True, scan all common ports; otherwise only essential ports
        
    Returns:
        Dictionary with open ports information
    """
    if ports is None:
        # By default, only scan essential ports (faster)
        if full_scan:
            ports = [80, 443, 22, 21, 25, 53, 3306, 5432, 8080, 8443]
        else:
            # Essential web ports only
            ports = [80, 443, 8080]
    
    result = {
        "open_ports": [],
        "closed_ports": [],
        "filtered_ports": [],
        "error": None
    }
    
    try:
        # Use ThreadPoolExecutor for concurrent port scanning
        with ThreadPoolExecutor(max_workers=min(10, len(ports))) as executor:
            future_to_port = {executor.submit(_check_single_port, host, port): port for port in ports}
            
            for future in as_completed(future_to_port):
                try:
                    port, status = future.result(timeout=2)
                    if status == "open":
                        result["open_ports"].append(port)
                    elif status == "closed":
                        result["closed_ports"].append(port)
                    else:
                        result["filtered_ports"].append(port)
                except socket.gaierror:
                    result["error"] = "DNS resolution failed"
                    break
                except Exception:
                    port = future_to_port[future]
                    result["filtered_ports"].append(port)
    except Exception as e:
        result["error"] = str(e)
    
    return result


def detect_technologies(url: str) -> Dict:
    """
    Detect technologies used by the website.
    
    Args:
        url: URL to analyze
        
    Returns:
        Dictionary with detected technologies
    """
    result = {
        "server": "",
        "cms": "",
        "framework": "",
        "languages": [],
        "cdn": "",
        "error": None
    }
    
    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=5, allow_redirects=True, verify=True)
        headers = response.headers
        
        # Detect server
        server = headers.get("server", "").lower()
        if "nginx" in server:
            result["server"] = "Nginx"
        elif "apache" in server:
            result["server"] = "Apache"
        elif "cloudflare" in server:
            result["server"] = "Cloudflare"
        elif "vercel" in server:
            result["server"] = "Vercel"
        elif "netlify" in server:
            result["server"] = "Netlify"
        else:
            result["server"] = server or "Unknown"
        
        # Detect CMS from headers and content
        content = response.text.lower()
        if "wp-content" in content or "wordpress" in content:
            result["cms"] = "WordPress"
        elif "joomla" in content:
            result["cms"] = "Joomla"
        elif "drupal" in content:
            result["cms"] = "Drupal"
        
        # Detect framework from headers
        powered_by = headers.get("x-powered-by", "").lower()
        if "php" in powered_by:
            result["languages"].append("PHP")
        if "node" in powered_by or "express" in powered_by:
            result["languages"].append("Node.js")
        if "python" in powered_by or "django" in powered_by:
            result["languages"].append("Python")
        if "ruby" in powered_by or "rails" in powered_by:
            result["languages"].append("Ruby")
        
        # Detect CDN
        if "cloudflare" in server or "cf-ray" in headers:
            result["cdn"] = "Cloudflare"
        elif "x-amz-cf-id" in headers:
            result["cdn"] = "Amazon CloudFront"
        elif "x-served-by" in headers:
            result["cdn"] = "Fastly"
        
    except Exception as e:
        result["error"] = str(e)
    
    return result


def analyze_security_headers(headers: Dict) -> Dict:
    """
    Analyze HTTP security headers for best practices.
    
    Args:
        headers: Dictionary of HTTP headers
        
    Returns:
        Dictionary with security header analysis
    """
    security_headers = {
        "strict-transport-security": {"present": False, "value": None, "score": 0},
        "x-frame-options": {"present": False, "value": None, "score": 0},
        "x-content-type-options": {"present": False, "value": None, "score": 0},
        "x-xss-protection": {"present": False, "value": None, "score": 0},
        "content-security-policy": {"present": False, "value": None, "score": 0},
        "referrer-policy": {"present": False, "value": None, "score": 0},
        "permissions-policy": {"present": False, "value": None, "score": 0},
    }
    
    total_score = 0
    max_score = len(security_headers) * 10
    
    for header_name in security_headers:
        header_value = headers.get(header_name, None)
        if header_value:
            security_headers[header_name]["present"] = True
            security_headers[header_name]["value"] = header_value
            security_headers[header_name]["score"] = 10
            total_score += 10
    
    return {
        "headers": security_headers,
        "score": total_score,
        "max_score": max_score,
        "percentage": int((total_score / max_score) * 100) if max_score > 0 else 0
    }


def check_cookies(url: str) -> Dict:
    """Analyze cookies and their security attributes."""
    result = {"cookies": [], "error": None}
    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=5, allow_redirects=True)
        for cookie in response.cookies:
            result["cookies"].append({
                "name": cookie.name,
                "value": cookie.value[:20] + "..." if len(cookie.value) > 20 else cookie.value,
                "domain": cookie.domain,
                "path": cookie.path,
                "secure": cookie.secure,
                "httponly": cookie.has_nonstandard_attr('HttpOnly'),
                "samesite": cookie.get_nonstandard_attr('SameSite')
            })
    except Exception as e:
        result["error"] = str(e)
    return result


def check_redirects(url: str) -> Dict:
    """Track the redirect chain."""
    result = {"chain": [], "final_url": url, "error": None}
    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=5, allow_redirects=True)
        result["final_url"] = response.url
        for resp in response.history:
            result["chain"].append({
                "status_code": resp.status_code,
                "url": resp.url
            })
    except Exception as e:
        result["error"] = str(e)
    return result


def check_page_metadata(url: str) -> Dict:
    """Extract basic page metadata."""
    result = {"title": "", "description": "", "error": None}
    try:
        response = requests.get(url, headers=DEFAULT_HEADERS, timeout=5)
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')
        result["title"] = soup.title.string if soup.title else ""
        desc = soup.find("meta", attrs={"name": "description"})
        result["description"] = desc["content"] if desc else ""
    except ImportError:
        result["error"] = "BeautifulSoup4 not installed"
    except Exception as e:
        result["error"] = str(e)
    return result


def analyze_web_security(url: str, include_port_scan: bool = False, include_metadata: bool = False) -> Dict:
    """
    Perform comprehensive web security analysis with parallel execution.
    
    Args:
        url: URL to analyze
        include_port_scan: If True, includes port scanning (slower)
        include_metadata: If True, includes page metadata extraction (slower)
        
    Returns:
        Dictionary with complete security analysis
        
    Performance:
        Uses ThreadPoolExecutor to run independent checks concurrently,
        reducing total analysis time by 80-90%.
    """
    # Ensure URL has scheme
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    parsed = urlparse(url)
    domain = parsed.netloc.split(":")[0] if parsed.netloc else ""
    path = parsed.path or "/"
    
    # Get IP address
    ip_address = None
    try:
        ip_address = socket.gethostbyname(domain)
    except:
        pass
    
    # Define all checks as tasks for parallel execution
    tasks = {}
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all independent tasks
        if parsed.scheme == "https":
            tasks["ssl_certificate"] = executor.submit(check_ssl_certificate, url)
        
        if domain:
            tasks["dns_records"] = executor.submit(check_dns_records, domain)
        
        tasks["http_headers"] = executor.submit(check_http_headers, url)
        tasks["security_txt"] = executor.submit(check_security_txt, url)
        tasks["technologies"] = executor.submit(detect_technologies, url)
        tasks["cookies"] = executor.submit(check_cookies, url)
        tasks["redirects"] = executor.submit(check_redirects, url)
        
        if ip_address:
            tasks["server_location"] = executor.submit(get_server_location, ip_address)
            if include_port_scan:
                tasks["port_scan"] = executor.submit(scan_ports, ip_address, None, False)
        
        if include_metadata:
            tasks["metadata"] = executor.submit(check_page_metadata, url)
        
        # Collect results as they complete
        results = {
            "url": url,
            "domain": domain,
            "ip_address": ip_address,
        }
        
        # Wait for all tasks to complete with timeout
        for task_name, future in tasks.items():
            try:
                results[task_name] = future.result(timeout=10)
            except Exception as e:
                results[task_name] = {"error": f"Task failed: {str(e)}"}
        
        # Add default values for optional checks not performed
        if "ssl_certificate" not in results:
            results["ssl_certificate"] = {"error": "Not HTTPS"}
        if "dns_records" not in results:
            results["dns_records"] = {"error": "No domain"}
        if "server_location" not in results:
            results["server_location"] = {"error": "No IP address"}
        if "port_scan" not in results:
            results["port_scan"] = {"error": "Port scan not requested" if not include_port_scan else "No IP address"}
        if "metadata" not in results:
            results["metadata"] = {"title": "", "description": "", "error": "Metadata not requested" if not include_metadata else None}
    
    # Analyze security headers (requires http_headers result)
    http_headers_result = results.get("http_headers", {})
    headers_dict = {k.lower(): v for k, v in http_headers_result.get("headers", {}).items()}
    results["security_headers_analysis"] = analyze_security_headers(headers_dict)

    # Add threat analysis using Monix engine
    suspicious = is_suspicious_url(path)
    
    threat_score = 0
    threats = []
    
    if suspicious:
        threat_score += 25
        threats.append("High-risk endpoint detected")
    
    # Check for suspicious patterns
    suspicious_patterns = [
        "..", "//", "eval", "exec", "cmd", "shell",
        ".env", ".git", ".htaccess", "passwd", "shadow"
    ]
    
    path_lower = path.lower()
    for pattern in suspicious_patterns:
        if pattern in path_lower:
            threat_score += 10
            threats.append(f"Suspicious pattern in path: {pattern}")
            break
    
    # Check security headers
    security_headers = results.get("http_headers", {}).get("security_headers", {})
    missing_security_headers = []
    for header in ["strict-transport-security", "x-frame-options", "content-security-policy"]:
        if not security_headers.get(header):
            missing_security_headers.append(header)
            threat_score += 5
    
    if missing_security_headers:
        threats.append(f"Missing security headers: {', '.join(missing_security_headers)}")
    
    # Check SSL
    ssl_info = results.get("ssl_certificate", {})
    if not ssl_info.get("valid") and ssl_info.get("error") != "Not HTTPS":
        threat_score += 30
        threats.append("SSL certificate issue detected")
    
    # Classify threat level
    level_name, level_color = classify_threat_level(threat_score)
    
    # Combine results
    results.update({
        "status": "success",
        "threat_score": threat_score,
        "threat_level": level_name,
        "threat_color": level_color,
        "threats": threats
    })
    
    return results
