"""Tests for scan_engine.scanners.web module."""

import socket
from unittest.mock import patch, MagicMock

from scan_engine.scanners.web import (
    check_ssl_certificate,
    check_dns_records,
    check_http_headers,
    check_security_txt,
    analyze_security_headers,
    scan_ports,
    detect_technologies,
    check_redirects,
)


class TestCheckSSLCertificate:
    def test_non_https_url_invalid(self):
        result = check_ssl_certificate("http://example.com")
        assert result["valid"] is False
        assert result["error"] == "URL must use HTTPS"

    @patch("scan_engine.scanners.web.socket.create_connection")
    def test_dns_failure(self, mock_conn):
        mock_conn.side_effect = socket.gaierror()
        result = check_ssl_certificate("https://invalid-domain-xyz.com")
        assert result["valid"] is False
        assert "DNS resolution failed" in result["error"]


class TestCheckDNSRecords:
    def test_no_dnspython_returns_error(self):
        with patch("scan_engine.scanners.web.DNS_AVAILABLE", False):
            result = check_dns_records("example.com")
        assert "dnspython" in result["error"]


class TestCheckHTTPHeaders:
    @patch("scan_engine.scanners.web.requests.get")
    def test_security_headers_extracted(self, mock_get):
        mock_get.return_value = MagicMock(
            headers={
                "server": "nginx",
                "strict-transport-security": "max-age=31536000",
            }
        )
        result = check_http_headers("https://example.com")
        assert result["security_headers"]["strict-transport-security"] == "max-age=31536000"

    @patch("scan_engine.scanners.web.requests.get")
    def test_missing_headers_are_none(self, mock_get):
        mock_get.return_value = MagicMock(headers={"server": "nginx"})
        result = check_http_headers("https://example.com")
        assert result["security_headers"]["x-frame-options"] is None


class TestCheckSecurityTxt:
    @patch("scan_engine.scanners.web.requests.get")
    def test_present(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, text="Contact: sec@example.com")
        result = check_security_txt("https://example.com")
        assert result["present"] is True


class TestAnalyzeSecurityHeaders:
    def test_all_present_gives_full_score(self):
        headers = {
            "strict-transport-security": "max-age=31536000",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "x-xss-protection": "1; mode=block",
            "content-security-policy": "default-src 'self'",
            "referrer-policy": "no-referrer",
            "permissions-policy": "geolocation=()",
        }
        result = analyze_security_headers(headers)
        assert result["percentage"] == 100


class TestScanPorts:
    @patch("scan_engine.scanners.web._check_single_port")
    def test_open_and_closed_classified(self, mock_check):
        def side(host, port, timeout=0.3):
            return (port, "open") if port in [80, 443] else (port, "closed")

        mock_check.side_effect = side
        result = scan_ports("example.com", ports=[80, 443, 8080])
        assert 80 in result["open_ports"]
        assert 8080 in result["closed_ports"]


class TestDetectTechnologies:
    @patch("scan_engine.scanners.web.requests.get")
    def test_nginx_detected(self, mock_get):
        mock_get.return_value = MagicMock(headers={"server": "nginx/1.18.0"}, text="<html></html>")
        assert detect_technologies("https://example.com")["server"] == "Nginx"


class TestCheckRedirects:
    @patch("scan_engine.scanners.web.requests.get")
    def test_redirect_chain_captured(self, mock_get):
        r1 = MagicMock(status_code=301, url="http://example.com")
        r2 = MagicMock(status_code=302, url="http://www.example.com")
        mock_get.return_value = MagicMock(url="https://www.example.com", history=[r1, r2])
        result = check_redirects("http://example.com")
        assert result["final_url"] == "https://www.example.com"
        assert len(result["chain"]) == 2
