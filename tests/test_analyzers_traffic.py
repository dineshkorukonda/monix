"""Tests for engine.analyzers.traffic module."""

import pytest
from datetime import datetime, timedelta
from engine.analyzers.traffic import (
    parse_log_line,
    is_suspicious_url,
    is_malicious_bot,
    analyze_traffic,
    classify_threat_level,
    LogEntry,
    SuspiciousIP
)


class TestParseLogLine:
    """Tests for parse_log_line function."""
    
    def test_parse_log_line_valid(self):
        """Test parsing a valid Nginx log line."""
        log_line = '192.168.1.100 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0"'
        
        entry = parse_log_line(log_line)
        
        assert entry is not None
        assert entry.ip == '192.168.1.100'
        assert entry.method == 'GET'
        assert entry.url == '/index.html'
        assert entry.status == 200
        assert entry.size == 1234
        assert entry.user_agent == 'Mozilla/5.0'
    
    def test_parse_log_line_404(self):
        """Test parsing a 404 error log line."""
        log_line = '10.0.0.1 - - [01/Jan/2024:12:00:00 +0000] "GET /admin HTTP/1.1" 404 162 "-" "curl/7.64.0"'
        
        entry = parse_log_line(log_line)
        
        assert entry is not None
        assert entry.ip == '10.0.0.1'
        assert entry.status == 404
        assert entry.url == '/admin'
    
    def test_parse_log_line_post_request(self):
        """Test parsing a POST request log line."""
        log_line = '192.168.1.100 - - [01/Jan/2024:12:00:00 +0000] "POST /api/login HTTP/1.1" 200 512 "-" "Mozilla/5.0"'
        
        entry = parse_log_line(log_line)
        
        assert entry is not None
        assert entry.method == 'POST'
        assert entry.url == '/api/login'
    
    def test_parse_log_line_with_size_dash(self):
        """Test parsing a log line with size as dash."""
        log_line = '192.168.1.100 - - [01/Jan/2024:12:00:00 +0000] "GET / HTTP/1.1" 200 - "-" "Mozilla/5.0"'
        
        entry = parse_log_line(log_line)
        
        assert entry is not None
        assert entry.size == 0
    
    def test_parse_log_line_invalid(self):
        """Test parsing an invalid log line."""
        log_line = 'This is not a valid log line'
        
        entry = parse_log_line(log_line)
        
        assert entry is None
    
    def test_parse_log_line_malformed(self):
        """Test parsing a malformed log line."""
        log_line = '192.168.1.100 - - [invalid_timestamp] "GET /test"'
        
        entry = parse_log_line(log_line)
        
        assert entry is None


class TestIsSuspiciousUrl:
    """Tests for is_suspicious_url function."""
    
    def test_is_suspicious_url_wp_admin(self):
        """Test WordPress admin URL detection."""
        assert is_suspicious_url('/wp-admin/') == True
        assert is_suspicious_url('/wp-login.php') == True
    
    def test_is_suspicious_url_phpmyadmin(self):
        """Test phpMyAdmin URL detection."""
        assert is_suspicious_url('/phpmyadmin/') == True
        assert is_suspicious_url('/pma/') == True
    
    def test_is_suspicious_url_env_file(self):
        """Test .env file URL detection."""
        assert is_suspicious_url('/.env') == True
        assert is_suspicious_url('/config/.env') == True
    
    def test_is_suspicious_url_git(self):
        """Test .git directory URL detection."""
        assert is_suspicious_url('/.git/config') == True
    
    def test_is_suspicious_url_shell(self):
        """Test shell endpoint detection."""
        assert is_suspicious_url('/shell.php') == True
        assert is_suspicious_url('/cmd') == True
    
    def test_is_suspicious_url_normal(self):
        """Test normal URLs are not suspicious."""
        assert is_suspicious_url('/') == False
        assert is_suspicious_url('/index.html') == False
        assert is_suspicious_url('/about') == False
        assert is_suspicious_url('/api/users') == False
    
    def test_is_suspicious_url_case_insensitive(self):
        """Test case-insensitive detection."""
        assert is_suspicious_url('/WP-ADMIN/') == True
        assert is_suspicious_url('/Wp-Login.PHP') == True


class TestIsMaliciousBot:
    """Tests for is_malicious_bot function."""
    
    def test_is_malicious_bot_sqlmap(self):
        """Test sqlmap detection."""
        assert is_malicious_bot('sqlmap/1.0') == True
    
    def test_is_malicious_bot_nikto(self):
        """Test nikto detection."""
        assert is_malicious_bot('Nikto/2.1.6') == True
    
    def test_is_malicious_bot_nmap(self):
        """Test nmap detection."""
        assert is_malicious_bot('nmap scripting engine') == True
    
    def test_is_malicious_bot_python_requests(self):
        """Test python-requests detection."""
        assert is_malicious_bot('python-requests/2.25.1') == True
    
    def test_is_malicious_bot_curl(self):
        """Test curl detection."""
        assert is_malicious_bot('curl/7.64.0') == True
    
    def test_is_malicious_bot_normal_browser(self):
        """Test normal browser user agents."""
        assert is_malicious_bot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36') == False
        assert is_malicious_bot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)') == False
    
    def test_is_malicious_bot_case_insensitive(self):
        """Test case-insensitive detection."""
        assert is_malicious_bot('SQLMAP/1.0') == True
        assert is_malicious_bot('NIKTO/2.1.6') == True


class TestAnalyzeTraffic:
    """Tests for analyze_traffic function."""
    
    def test_analyze_traffic_empty(self):
        """Test analyzing empty traffic."""
        entries = []
        suspicious = analyze_traffic(entries)
        
        assert suspicious == []
    
    def test_analyze_traffic_normal(self):
        """Test analyzing normal traffic."""
        entries = [
            LogEntry('192.168.1.100', datetime.now(), 'GET', '/index.html', 200, 'Mozilla/5.0', 1234),
            LogEntry('192.168.1.101', datetime.now(), 'GET', '/about', 200, 'Mozilla/5.0', 567),
        ]
        
        suspicious = analyze_traffic(entries, high_rate_threshold=30)
        
        # Normal traffic should not be flagged
        assert len(suspicious) == 0
    
    def test_analyze_traffic_high_rate(self):
        """Test detecting high request rate."""
        # Create 35 requests from same IP
        entries = [
            LogEntry('10.0.0.50', datetime.now(), 'GET', f'/page{i}', 200, 'Mozilla/5.0', 100)
            for i in range(35)
        ]
        
        suspicious = analyze_traffic(entries, high_rate_threshold=30)
        
        # Should detect high rate
        assert len(suspicious) > 0
        assert suspicious[0].ip == '10.0.0.50'
        assert suspicious[0].high_rate == True
        assert suspicious[0].total_hits == 35
    
    def test_analyze_traffic_404_scanning(self):
        """Test detecting 404 scanning."""
        # Create many 404 requests
        entries = [
            LogEntry('10.0.0.100', datetime.now(), 'GET', f'/test{i}', 404, 'curl/7.64.0', 162)
            for i in range(10)
        ]
        
        suspicious = analyze_traffic(entries)
        
        # Should detect 404 scanning
        assert len(suspicious) > 0
        assert suspicious[0].status_404_count >= 5
        assert suspicious[0].threat_score > 0
    
    def test_analyze_traffic_suspicious_urls(self):
        """Test detecting access to suspicious URLs."""
        entries = [
            LogEntry('10.0.0.200', datetime.now(), 'GET', '/wp-admin/', 404, 'Mozilla/5.0', 162),
            LogEntry('10.0.0.200', datetime.now(), 'GET', '/.env', 404, 'Mozilla/5.0', 162),
            LogEntry('10.0.0.200', datetime.now(), 'GET', '/phpmyadmin/', 404, 'Mozilla/5.0', 162),
        ]
        
        suspicious = analyze_traffic(entries)
        
        # Should detect suspicious URL access
        assert len(suspicious) > 0
        assert len(suspicious[0].suspicious_urls) == 3
        assert suspicious[0].threat_score > 0
    
    def test_analyze_traffic_malicious_bot(self):
        """Test detecting malicious bot."""
        entries = [
            LogEntry('10.0.0.250', datetime.now(), 'GET', '/admin', 404, 'sqlmap/1.0', 162),
        ]
        
        suspicious = analyze_traffic(entries)
        
        # Should detect malicious bot
        assert len(suspicious) > 0
        assert suspicious[0].malicious_bot == True
        assert suspicious[0].threat_score >= 30
    
    def test_analyze_traffic_combined_threats(self):
        """Test detecting combined threat patterns."""
        entries = []
        
        # High rate + suspicious URLs + malicious bot
        for i in range(35):
            entries.append(
                LogEntry('10.0.0.99', datetime.now(), 'GET', '/wp-admin/', 404, 'nikto/2.1.6', 162)
            )
        
        suspicious = analyze_traffic(entries, high_rate_threshold=30)
        
        # Should have high threat score
        assert len(suspicious) > 0
        assert suspicious[0].threat_score >= 50  # Should be CRITICAL
        assert suspicious[0].high_rate == True
        assert suspicious[0].malicious_bot == True
    
    def test_analyze_traffic_sorting(self):
        """Test that results are sorted by threat score."""
        entries = []
        
        # IP 1: Medium threat (multiple 404s)
        entries.extend([
            LogEntry('10.0.0.1', datetime.now(), 'GET', f'/test{i}', 404, 'Mozilla/5.0', 162)
            for i in range(6)
        ])
        
        # IP 2: High threat (malicious bot + suspicious URL + more 404s)
        entries.extend([
            LogEntry('10.0.0.2', datetime.now(), 'GET', '/wp-admin/', 404, 'sqlmap/1.0', 162)
            for _ in range(10)
        ])
        
        suspicious = analyze_traffic(entries)
        
        # Should have both IPs
        assert len(suspicious) >= 2
        # IP 2 should be first (higher threat score)
        assert suspicious[0].ip == '10.0.0.2'
        # Verify sorted by threat score
        for i in range(len(suspicious) - 1):
            assert suspicious[i].threat_score >= suspicious[i+1].threat_score


class TestClassifyThreatLevel:
    """Tests for classify_threat_level function."""
    
    def test_classify_threat_level_low(self):
        """Test LOW threat classification."""
        level, color = classify_threat_level(10)
        assert level == 'LOW'
        assert color == 'white'
    
    def test_classify_threat_level_medium(self):
        """Test MEDIUM threat classification."""
        level, color = classify_threat_level(20)
        assert level == 'MEDIUM'
        assert color == 'cyan'
    
    def test_classify_threat_level_high(self):
        """Test HIGH threat classification."""
        level, color = classify_threat_level(40)
        assert level == 'HIGH'
        assert color == 'yellow'
    
    def test_classify_threat_level_critical(self):
        """Test CRITICAL threat classification."""
        level, color = classify_threat_level(60)
        assert level == 'CRITICAL'
        assert color == 'red'
    
    def test_classify_threat_level_boundaries(self):
        """Test boundary values."""
        # Test at exact boundaries
        level, _ = classify_threat_level(15)
        assert level == 'MEDIUM'
        
        level, _ = classify_threat_level(30)
        assert level == 'HIGH'
        
        level, _ = classify_threat_level(50)
        assert level == 'CRITICAL'
