"""Tests for api.analyzers.threat module."""

from scan_engine.analyzers.threat import analyze_connections, detect_threats


class TestAnalyzeConnections:
    """Tests for analyze_connections function."""

    def test_analyze_connections_empty(self):
        """Empty list returns zero counts."""
        stats = analyze_connections([])
        assert stats["total"] == 0
        assert stats["established"] == 0
        assert stats["listening"] == 0
        assert stats["alerts_count"] == 0

    def test_analyze_connections_basic(self):
        """Mixed states are counted correctly with top processes."""
        connections = [
            {"state": "ESTABLISHED", "pname": "ssh", "remote_ip": "192.168.1.100"},
            {"state": "LISTEN", "pname": "nginx", "remote_ip": "0.0.0.0"},
            {"state": "TIME_WAIT", "pname": "firefox", "remote_ip": "8.8.8.8"},
        ]
        stats = analyze_connections(connections)
        assert stats["total"] == 3
        assert stats["established"] == 1
        assert stats["listening"] == 1
        assert stats["time_wait"] == 1
        assert len(stats["top_processes"]) > 0


class TestDetectThreats:
    """Tests for detect_threats function."""

    def test_detect_threats_empty(self):
        """No connections produce no threats."""
        assert detect_threats([]) == []

    def test_detect_threats_syn_flood(self):
        """50+ SYN_RECV connections from one IP triggers SYN_FLOOD alert."""
        connections = [
            {"state": "SYN_RECV", "remote_ip": "10.0.0.50", "local_port": i} for i in range(55)
        ]
        threats = detect_threats(connections)
        assert any("SYN_FLOOD" in t and "10.0.0.50" in t for t in threats)

    def test_detect_threats_port_scan(self):
        """Connections from one IP to 5+ distinct ports triggers PORT_SCAN alert."""
        connections = [
            {"state": "ESTABLISHED", "remote_ip": "10.0.0.200", "local_port": p}
            for p in [22, 80, 443, 3306, 8080, 9000]
        ]
        threats = detect_threats(connections)
        assert any("PORT_SCAN" in t and "10.0.0.200" in t for t in threats)
