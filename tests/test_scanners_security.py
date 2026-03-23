"""Tests for api.scanners.security."""

from api.scanners.security import (
    check_dangerous_ports,
    check_listening_count,
    check_outbound_suspicious,
    check_sensitive_external,
    check_ssh_port,
    run_security_checks,
)


def _conn(**overrides):
    base = {
        "local_port": 80,
        "remote_port": 443,
        "remote_ip": "8.8.8.8",
        "state": "ESTABLISHED",
    }
    base.update(overrides)
    return base


class TestSecurityChecks:
    def test_run_security_checks_returns_all_checks(self):
        results = run_security_checks([_conn()])
        assert len(results) == 5
        assert {item["name"] for item in results} == {
            "SSH Port Check",
            "Dangerous Ports",
            "Listening Ports Count",
            "External DB/Service Access",
            "Suspicious Outbound",
        }

    def test_ssh_port_detects_default_listener(self):
        result = check_ssh_port([_conn(local_port=22, state="LISTEN")])
        assert result["passed"] is False

    def test_dangerous_ports_lists_exposed_services(self):
        result = check_dangerous_ports(
            [_conn(local_port=21, state="LISTEN"), _conn(local_port=3389, state="LISTEN")]
        )
        assert result["passed"] is False
        assert "FTP:21" in result["details"]
        assert "RDP:3389" in result["details"]

    def test_listening_count_fails_at_50(self):
        result = check_listening_count([_conn(state="LISTEN") for _ in range(50)])
        assert result["passed"] is False
        assert "50 ports listening" in result["details"]

    def test_sensitive_external_ignores_local_ips(self):
        result = check_sensitive_external(
            [_conn(local_port=5432, state="ESTABLISHED", remote_ip="127.0.0.1")]
        )
        assert result["passed"] is True

    def test_sensitive_external_flags_remote_sensitive_access(self):
        result = check_sensitive_external(
            [_conn(local_port=5432, state="ESTABLISHED", remote_ip="9.9.9.9")]
        )
        assert result["passed"] is False
        assert "9.9.9.9" in result["details"]

    def test_outbound_suspicious_flags_known_ports(self):
        result = check_outbound_suspicious([_conn(remote_port=31337, remote_ip="5.5.5.5")])
        assert result["passed"] is False
        assert "5.5.5.5:31337" in result["details"]
