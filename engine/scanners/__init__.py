"""
Security scanning modules for Monix.

This package contains modules responsible for security scanning:
- security: System security checks (SSH ports, dangerous ports, etc.)
- web: Web security analysis (SSL, DNS, headers, port scanning, etc.)
"""

from engine.scanners.security import run_security_checks
from engine.scanners.web import (
    check_ssl_certificate,
    check_dns_records,
    check_http_headers,
    check_security_txt,
    get_server_location,
    scan_ports,
    detect_technologies,
    analyze_security_headers,
    check_cookies,
    check_redirects,
    check_page_metadata,
    analyze_web_security
)

__all__ = [
    'run_security_checks',
    'check_ssl_certificate',
    'check_dns_records',
    'check_http_headers',
    'check_security_txt',
    'get_server_location',
    'scan_ports',
    'detect_technologies',
    'analyze_security_headers',
    'check_cookies',
    'check_redirects',
    'check_page_metadata',
    'analyze_web_security'
]
