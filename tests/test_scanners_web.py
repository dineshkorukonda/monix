"""Tests for engine.scanners.web module."""

import pytest
from unittest.mock import patch, MagicMock
from engine.scanners.web import (
    check_ssl_certificate,
    check_dns_records,
    check_http_headers,
    check_security_txt,
    analyze_security_headers,
    scan_ports,
    detect_technologies,
    check_cookies,
    check_redirects
)


class TestCheckSSLCertificate:
    """Tests for check_ssl_certificate function."""
    
    def test_check_ssl_certificate_non_https(self):
        """Test SSL check with non-HTTPS URL."""
        result = check_ssl_certificate('http://example.com')
        
        assert result['valid'] == False
        assert result['error'] == 'URL must use HTTPS'
    
    @patch('engine.scanners.web.socket.create_connection')
    @patch('engine.scanners.web.ssl.create_default_context')
    def test_check_ssl_certificate_timeout(self, mock_ssl_context, mock_socket):
        """Test SSL check with connection timeout."""
        mock_socket.side_effect = TimeoutError()
        
        result = check_ssl_certificate('https://example.com')
        
        assert result['valid'] == False
        assert 'error' in result
    
    @patch('engine.scanners.web.socket.create_connection')
    def test_check_ssl_certificate_dns_failure(self, mock_socket):
        """Test SSL check with DNS failure."""
        import socket
        mock_socket.side_effect = socket.gaierror()
        
        result = check_ssl_certificate('https://invalid-domain-xyz.com')
        
        assert result['valid'] == False
        assert 'DNS resolution failed' in result['error']


class TestCheckDNSRecords:
    """Tests for check_dns_records function."""
    
    def test_check_dns_records_no_dnspython(self):
        """Test DNS check without dnspython installed."""
        with patch('engine.scanners.web.DNS_AVAILABLE', False):
            result = check_dns_records('example.com')
            
            assert 'error' in result
            assert 'dnspython' in result['error']
    
    @patch('engine.scanners.web.DNS_AVAILABLE', True)
    @patch('engine.scanners.web.dns.resolver.resolve')
    def test_check_dns_records_success(self, mock_resolve):
        """Test successful DNS record retrieval."""
        # Mock A record
        mock_a_answer = MagicMock()
        mock_a_answer.__iter__ = lambda self: iter([MagicMock(__str__=lambda x: '93.184.216.34')])
        
        def resolve_side_effect(domain, record_type):
            if record_type == 'A':
                return mock_a_answer
            raise Exception("NXDOMAIN")
        
        mock_resolve.side_effect = resolve_side_effect
        
        result = check_dns_records('example.com')
        
        assert 'a' in result
        assert len(result['a']) > 0


class TestCheckHTTPHeaders:
    """Tests for check_http_headers function."""
    
    @patch('engine.scanners.web.requests.get')
    def test_check_http_headers_success(self, mock_get):
        """Test successful HTTP headers retrieval."""
        mock_response = MagicMock()
        mock_response.headers = {
            'server': 'nginx',
            'content-type': 'text/html',
            'strict-transport-security': 'max-age=31536000'
        }
        mock_get.return_value = mock_response
        
        result = check_http_headers('https://example.com')
        
        assert 'headers' in result
        assert 'security_headers' in result
        assert result['security_headers']['strict-transport-security'] == 'max-age=31536000'
    
    @patch('engine.scanners.web.requests.get')
    def test_check_http_headers_timeout(self, mock_get):
        """Test HTTP headers check with timeout."""
        import requests
        mock_get.side_effect = requests.exceptions.Timeout()
        
        result = check_http_headers('https://example.com')
        
        assert 'error' in result
    
    @patch('engine.scanners.web.requests.get')
    def test_check_http_headers_missing_security_headers(self, mock_get):
        """Test missing security headers detection."""
        mock_response = MagicMock()
        mock_response.headers = {
            'server': 'nginx',
            'content-type': 'text/html'
        }
        mock_get.return_value = mock_response
        
        result = check_http_headers('https://example.com')
        
        # Missing security headers should be None
        assert result['security_headers']['strict-transport-security'] is None
        assert result['security_headers']['x-frame-options'] is None


class TestCheckSecurityTxt:
    """Tests for check_security_txt function."""
    
    @patch('engine.scanners.web.requests.get')
    def test_check_security_txt_present(self, mock_get):
        """Test security.txt file detection."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = 'Contact: security@example.com'
        mock_get.return_value = mock_response
        
        result = check_security_txt('https://example.com')
        
        assert result['present'] == True
        assert 'security@example.com' in result['content']
    
    @patch('engine.scanners.web.requests.get')
    def test_check_security_txt_not_present(self, mock_get):
        """Test when security.txt is not present."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response
        
        result = check_security_txt('https://example.com')
        
        assert result['present'] == False


class TestAnalyzeSecurityHeaders:
    """Tests for analyze_security_headers function."""
    
    def test_analyze_security_headers_all_present(self):
        """Test analysis with all security headers present."""
        headers = {
            'strict-transport-security': 'max-age=31536000',
            'x-frame-options': 'DENY',
            'x-content-type-options': 'nosniff',
            'x-xss-protection': '1; mode=block',
            'content-security-policy': "default-src 'self'",
            'referrer-policy': 'no-referrer',
            'permissions-policy': 'geolocation=()'
        }
        
        result = analyze_security_headers(headers)
        
        assert result['score'] == result['max_score']
        assert result['percentage'] == 100
    
    def test_analyze_security_headers_none_present(self):
        """Test analysis with no security headers."""
        headers = {
            'server': 'nginx',
            'content-type': 'text/html'
        }
        
        result = analyze_security_headers(headers)
        
        assert result['score'] == 0
        assert result['percentage'] == 0
    
    def test_analyze_security_headers_partial(self):
        """Test analysis with some security headers."""
        headers = {
            'strict-transport-security': 'max-age=31536000',
            'x-frame-options': 'DENY',
            'content-security-policy': "default-src 'self'"
        }
        
        result = analyze_security_headers(headers)
        
        assert result['score'] == 30  # 3 headers * 10 points
        assert 0 < result['percentage'] < 100


class TestScanPorts:
    """Tests for scan_ports function."""
    
    @patch('engine.scanners.web._check_single_port')
    def test_scan_ports_basic(self, mock_check_port):
        """Test basic port scanning."""
        # Mock port checks
        def check_port_side_effect(host, port, timeout=0.3):
            if port in [80, 443]:
                return (port, 'open')
            return (port, 'closed')
        
        mock_check_port.side_effect = check_port_side_effect
        
        result = scan_ports('example.com', ports=[80, 443, 8080])
        
        assert 80 in result['open_ports']
        assert 443 in result['open_ports']
        assert 8080 in result['closed_ports']
    
    @patch('engine.scanners.web._check_single_port')
    def test_scan_ports_default_web_ports(self, mock_check_port):
        """Test scanning with default web ports."""
        mock_check_port.return_value = (80, 'open')
        
        result = scan_ports('example.com')
        
        # Default should scan essential web ports only
        assert 'open_ports' in result
        assert 'closed_ports' in result
    
    @patch('engine.scanners.web._check_single_port')
    def test_scan_ports_dns_error(self, mock_check_port):
        """Test port scan with DNS error."""
        import socket
        mock_check_port.side_effect = socket.gaierror()
        
        result = scan_ports('invalid-domain-xyz.com')
        
        assert 'error' in result


class TestDetectTechnologies:
    """Tests for detect_technologies function."""
    
    @patch('engine.scanners.web.requests.get')
    def test_detect_technologies_nginx(self, mock_get):
        """Test detecting Nginx server."""
        mock_response = MagicMock()
        mock_response.headers = {'server': 'nginx/1.18.0'}
        mock_response.text = '<html></html>'
        mock_get.return_value = mock_response
        
        result = detect_technologies('https://example.com')
        
        assert result['server'] == 'Nginx'
    
    @patch('engine.scanners.web.requests.get')
    def test_detect_technologies_wordpress(self, mock_get):
        """Test detecting WordPress CMS."""
        mock_response = MagicMock()
        mock_response.headers = {'server': 'Apache'}
        mock_response.text = '<html><link href="/wp-content/themes/"></html>'
        mock_get.return_value = mock_response
        
        result = detect_technologies('https://example.com')
        
        assert result['cms'] == 'WordPress'
    
    @patch('engine.scanners.web.requests.get')
    def test_detect_technologies_php(self, mock_get):
        """Test detecting PHP."""
        mock_response = MagicMock()
        mock_response.headers = {
            'server': 'Apache',
            'x-powered-by': 'PHP/7.4.3'
        }
        mock_response.text = '<html></html>'
        mock_get.return_value = mock_response
        
        result = detect_technologies('https://example.com')
        
        assert 'PHP' in result['languages']
    
    @patch('engine.scanners.web.requests.get')
    def test_detect_technologies_cloudflare(self, mock_get):
        """Test detecting Cloudflare CDN."""
        mock_response = MagicMock()
        mock_response.headers = {
            'server': 'cloudflare',
            'cf-ray': '12345'
        }
        mock_response.text = '<html></html>'
        mock_get.return_value = mock_response
        
        result = detect_technologies('https://example.com')
        
        assert result['cdn'] == 'Cloudflare'


class TestCheckCookies:
    """Tests for check_cookies function."""
    
    @patch('engine.scanners.web.requests.get')
    def test_check_cookies_success(self, mock_get):
        """Test successful cookie analysis."""
        mock_response = MagicMock()
        mock_cookie = MagicMock()
        mock_cookie.name = 'session_id'
        mock_cookie.value = 'abc123xyz'
        mock_cookie.domain = 'example.com'
        mock_cookie.path = '/'
        mock_cookie.secure = True
        mock_cookie.has_nonstandard_attr.return_value = True
        mock_cookie.get_nonstandard_attr.return_value = 'Strict'
        
        mock_response.cookies = [mock_cookie]
        mock_get.return_value = mock_response
        
        result = check_cookies('https://example.com')
        
        assert len(result['cookies']) == 1
        assert result['cookies'][0]['name'] == 'session_id'
        assert result['cookies'][0]['secure'] == True


class TestCheckRedirects:
    """Tests for check_redirects function."""
    
    @patch('engine.scanners.web.requests.get')
    def test_check_redirects_no_redirect(self, mock_get):
        """Test when there's no redirect."""
        mock_response = MagicMock()
        mock_response.url = 'https://example.com'
        mock_response.history = []
        mock_get.return_value = mock_response
        
        result = check_redirects('https://example.com')
        
        assert result['final_url'] == 'https://example.com'
        assert len(result['chain']) == 0
    
    @patch('engine.scanners.web.requests.get')
    def test_check_redirects_with_chain(self, mock_get):
        """Test with redirect chain."""
        # Create redirect chain
        redirect1 = MagicMock()
        redirect1.status_code = 301
        redirect1.url = 'http://example.com'
        
        redirect2 = MagicMock()
        redirect2.status_code = 302
        redirect2.url = 'http://www.example.com'
        
        mock_response = MagicMock()
        mock_response.url = 'https://www.example.com'
        mock_response.history = [redirect1, redirect2]
        mock_get.return_value = mock_response
        
        result = check_redirects('http://example.com')
        
        assert result['final_url'] == 'https://www.example.com'
        assert len(result['chain']) == 2
        assert result['chain'][0]['status_code'] == 301
