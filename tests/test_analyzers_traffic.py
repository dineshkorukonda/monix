"""Tests for api.analyzers.traffic module."""

from datetime import datetime
from api.analyzers.traffic import (
    parse_log_line,
    is_suspicious_url,
    is_malicious_bot,
    analyze_traffic,
    classify_threat_level,
    LogEntry,
)

_VALID_LINE = '192.168.1.100 - - [01/Jan/2024:12:00:00 +0000] "GET /index.html HTTP/1.1" 200 1234 "-" "Mozilla/5.0"'


class TestParseLogLine:
    """Tests for parse_log_line function."""

    def test_parse_valid_line(self):
        """All fields are extracted from a well-formed log line."""
        entry = parse_log_line(_VALID_LINE)
        assert entry is not None
        assert entry.ip == "192.168.1.100"
        assert entry.method == "GET"
        assert entry.url == "/index.html"
        assert entry.status == 200
        assert entry.size == 1234
        assert entry.user_agent == "Mozilla/5.0"

    def test_parse_invalid_line_returns_none(self):
        """Malformed input returns None without raising."""
        assert parse_log_line("not a log line") is None


class TestIsSuspiciousUrl:
    """Tests for is_suspicious_url function."""

    def test_high_risk_endpoint_detected(self):
        """Known attack targets are flagged."""
        assert is_suspicious_url("/wp-admin/") is True
        assert is_suspicious_url("/WP-LOGIN.PHP") is True  # case-insensitive

    def test_normal_path_not_suspicious(self):
        """Ordinary paths are not flagged."""
        assert is_suspicious_url("/") is False
        assert is_suspicious_url("/api/users") is False


class TestIsMaliciousBot:
    """Tests for is_malicious_bot function."""

    def test_scanner_user_agent_detected(self):
        """Known scanner user-agents are flagged."""
        assert is_malicious_bot("sqlmap/1.0") is True
        assert is_malicious_bot("NIKTO/2.1.6") is True  # case-insensitive

    def test_browser_not_malicious(self):
        """Real browser UA is not flagged."""
        assert (
            is_malicious_bot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            is False
        )


class TestAnalyzeTraffic:
    """Tests for analyze_traffic function."""

    def test_empty_traffic_returns_empty(self):
        """No entries produce an empty suspicious list."""
        assert analyze_traffic([]) == []

    def test_high_rate_detected(self):
        """IP exceeding the request-rate threshold is flagged."""
        entries = [
            LogEntry("10.0.0.50", datetime.now(), "GET", f"/p{i}", 200, "Mozilla/5.0", 100)
            for i in range(35)
        ]
        suspicious = analyze_traffic(entries, high_rate_threshold=30)
        assert len(suspicious) > 0
        assert suspicious[0].ip == "10.0.0.50"
        assert suspicious[0].high_rate is True

    def test_malicious_bot_detected(self):
        """IP using a malicious bot UA is flagged with high threat score."""
        entries = [LogEntry("10.0.0.250", datetime.now(), "GET", "/admin", 404, "sqlmap/1.0", 162)]
        suspicious = analyze_traffic(entries)
        assert len(suspicious) > 0
        assert suspicious[0].malicious_bot is True
        assert suspicious[0].threat_score >= 30


class TestClassifyThreatLevel:
    """Tests for classify_threat_level function."""

    def test_all_levels_classified_correctly(self):
        """Boundary values map to the correct level names."""
        assert classify_threat_level(5)[0] == "LOW"
        assert classify_threat_level(15)[0] == "MEDIUM"
        assert classify_threat_level(30)[0] == "HIGH"
        assert classify_threat_level(50)[0] == "CRITICAL"
