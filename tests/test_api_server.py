"""Tests for API server endpoints."""

import json
from types import SimpleNamespace
from unittest.mock import patch
import pytest

from api.server import app, analyze_url


@pytest.fixture
def client():
    """Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "ok"
        assert data["service"] == "monix-api"


class TestAnalyzeUrlEndpoint:
    @patch(
        "api.server.calculate_overall_score",
        return_value={"overall": 70, "security": 60, "seo": 80, "performance": 75},
    )
    @patch("api.server.run_performance_checks", return_value={"mobile": {}, "desktop": {}})
    @patch("api.server.run_seo_checks", return_value={"seo_score": 80})
    @patch("api.server.analyze_web_security")
    def test_success(self, mock_analyze, _mock_seo, _mock_perf, _mock_scores, client):
        mock_analyze.return_value = {
            "url": "https://example.com",
            "status": "success",
            "threat_score": 10,
        }
        resp = client.post(
            "/api/analyze-url",
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert data["scores"]["overall"] == 70

    def test_missing_url_returns_400(self, client):
        resp = client.post(
            "/api/analyze-url",
            data=json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 400
        assert "url" in json.loads(resp.data)["error"].lower()

    @patch("api.server.analyze_web_security")
    def test_exception_returns_500(self, mock_analyze, client):
        mock_analyze.side_effect = Exception("boom")
        resp = client.post(
            "/api/analyze-url",
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"

    @patch(
        "api.server.calculate_overall_score",
        return_value={"overall": 50, "security": 50, "seo": 50, "performance": 50},
    )
    @patch("api.server.run_performance_checks", return_value={"mobile": {}, "desktop": {}})
    @patch("api.server.run_seo_checks", return_value={"seo_score": 50})
    @patch("api.server.analyze_web_security", return_value={"status": "success"})
    def test_full_query_param_enables_optional_checks(
        self, mock_analyze, _mock_seo, _mock_perf, _mock_scores, client
    ):
        resp = client.post(
            "/api/analyze-url?full=true",
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        mock_analyze.assert_called_once_with(
            "https://example.com",
            include_port_scan=True,
            include_metadata=True,
        )

    @patch(
        "api.server.calculate_overall_score",
        return_value={"overall": 50, "security": 50, "seo": 50, "performance": 50},
    )
    @patch("api.server.run_performance_checks", return_value={"mobile": {}, "desktop": {}})
    @patch("api.server.run_seo_checks", return_value={"seo_score": 50})
    @patch("api.server.analyze_web_security", return_value={"status": "success"})
    def test_request_flags_override_default_scan_options(
        self, mock_analyze, _mock_seo, _mock_perf, _mock_scores, client
    ):
        resp = client.post(
            "/api/analyze-url",
            data=json.dumps(
                {
                    "url": "https://example.com",
                    "include_port_scan": True,
                    "include_metadata": False,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        mock_analyze.assert_called_once_with(
            "https://example.com",
            include_port_scan=True,
            include_metadata=False,
        )


class TestAnalyzeUrlHelper:
    @patch("api.server.requests.get")
    @patch("api.server.get_ip_info")
    @patch("api.server.socket.gethostbyname", return_value="1.2.3.4")
    def test_collects_host_and_coordinate_data(self, _mock_dns, mock_ip_info, mock_requests_get):
        mock_ip_info.return_value = {"geo": "Test Geo", "hostname": "host.example"}
        mock_requests_get.return_value.json.return_value = {"loc": "12.3,45.6"}

        result = analyze_url("https://example.com/admin")

        assert result["status"] == "success"
        assert result["domain"] == "example.com"
        assert result["ip_address"] == "1.2.3.4"
        assert result["hostname"] == "host.example"
        assert result["coordinates"] == {"latitude": 12.3, "longitude": 45.6}
        assert result["threat_score"] >= 25
        assert result["suspicious"] is True

    @patch("api.server.socket.gethostbyname", side_effect=OSError("dns failed"))
    def test_dns_failure_keeps_analysis_running(self, _mock_dns):
        result = analyze_url("https://example.com/index.html")

        assert result["status"] == "success"
        assert result["ip_address"] is None
        assert result["coordinates"] is None
        assert result["domain"] == "example.com"


class TestAnalyzeIpEndpoint:
    @patch("api.server.get_ip_info")
    def test_success(self, mock_info, client):
        mock_info.return_value = {"geo": "US", "hostname": "dns.google"}
        resp = client.post(
            "/api/analyze-ip",
            data=json.dumps({"ip": "8.8.8.8"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert data["ip"] == "8.8.8.8"

    def test_missing_ip_returns_400(self, client):
        resp = client.post("/api/analyze-ip", data=json.dumps({}), content_type="application/json")
        assert resp.status_code == 400
        assert "ip" in json.loads(resp.data)["error"].lower()


class TestThreatInfoEndpoint:
    def test_returns_lists(self, client):
        resp = client.get("/api/threat-info")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert isinstance(data["high_risk_endpoints"], list)
        assert isinstance(data["malicious_bot_signatures"], list)


class TestConnectionsEndpoint:
    @patch("api.server.collect_connections")
    def test_success(self, mock_collect, client):
        mock_collect.return_value = [{"local_ip": "127.0.0.1", "state": "ESTABLISHED"}]
        resp = client.get("/api/connections")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert data["count"] == 1

    @patch("api.server.collect_connections", side_effect=RuntimeError("collector down"))
    def test_error_returns_500(self, _mock_collect, client):
        resp = client.get("/api/connections")
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"


class TestAlertsEndpoint:
    @patch("api.server.state.snapshot")
    def test_success(self, mock_snap, client):
        mock_snap.return_value = ([], [{"type": "SYN_FLOOD"}])
        resp = client.get("/api/alerts")
        assert resp.status_code == 200
        assert json.loads(resp.data)["count"] == 1

    @patch("api.server.state.snapshot", side_effect=RuntimeError("snapshot failed"))
    def test_error_returns_500(self, _mock_snap, client):
        resp = client.get("/api/alerts")
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"


class TestSystemStatsEndpoint:
    @patch("api.server.get_system_stats")
    def test_success(self, mock_stats, client):
        mock_stats.return_value = {"cpu_percent": 10.0, "memory_percent": 20.0}
        resp = client.get("/api/system-stats")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert data["cpu_percent"] == 10.0

    @patch("api.server.get_system_stats", side_effect=RuntimeError("stats failed"))
    def test_error_returns_500(self, _mock_stats, client):
        resp = client.get("/api/system-stats")
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"


class TestProcessesEndpoint:
    @patch("api.server.get_top_processes")
    def test_success_uses_limit_query_param(self, mock_processes, client):
        mock_processes.return_value = [{"pid": 1, "cpu_percent": 90.0}]

        resp = client.get("/api/processes?limit=5")

        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert data["count"] == 1
        mock_processes.assert_called_once_with(limit=5)

    @patch("api.server.get_top_processes", side_effect=RuntimeError("processes failed"))
    def test_error_returns_500(self, _mock_processes, client):
        resp = client.get("/api/processes")
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"


class TestDashboardEndpoint:
    @patch("api.server.collect_connections")
    @patch("api.server.state.snapshot")
    @patch("api.server.get_system_stats")
    @patch("api.server.get_traffic_summary")
    def test_success(self, mock_traffic, mock_stats, mock_snap, mock_conns, client):
        mock_conns.return_value = []
        mock_snap.return_value = ([], [])
        mock_stats.return_value = {"cpu_percent": 5.0}
        mock_traffic.return_value = {
            "total_requests": 10,
            "unique_ips": 5,
            "total_404s": 1,
            "high_risk_hits": 0,
            "suspicious_ips": [],
        }
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["status"] == "success"
        assert "traffic_summary" in data

    @patch("api.server.collect_connections")
    @patch("api.server.state.snapshot")
    @patch("api.server.get_system_stats")
    @patch("api.server.get_traffic_summary")
    def test_traffic_error_falls_back_to_defaults(
        self, mock_traffic, mock_stats, mock_snap, mock_conns, client
    ):
        mock_conns.return_value = []
        mock_snap.return_value = ([], [])
        mock_stats.return_value = {"cpu_percent": 5.0}
        mock_traffic.side_effect = Exception("log unavailable")
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        assert json.loads(resp.data)["traffic_summary"]["total_requests"] == 0

    @patch("api.server.collect_connections")
    @patch("api.server.state.snapshot")
    @patch("api.server.get_system_stats")
    @patch("api.server.get_traffic_summary")
    def test_suspicious_ips_are_serialized(
        self, mock_traffic, mock_stats, mock_snap, mock_conns, client
    ):
        mock_conns.return_value = []
        mock_snap.return_value = ([], [])
        mock_stats.return_value = {"cpu_percent": 5.0}
        mock_traffic.return_value = {
            "total_requests": 12,
            "unique_ips": 3,
            "total_404s": 1,
            "high_risk_hits": 2,
            "suspicious_ips": [SimpleNamespace(ip="1.1.1.1", threat_score=88, total_hits=4)],
        }

        resp = client.get("/api/dashboard")

        assert resp.status_code == 200
        payload = json.loads(resp.data)
        assert payload["traffic_summary"]["suspicious_ips"] == [
            {"ip": "1.1.1.1", "threat_score": 88, "total_hits": 4}
        ]

    @patch("api.server.collect_connections", side_effect=RuntimeError("connections failed"))
    def test_top_level_error_returns_500(self, _mock_conns, client):
        resp = client.get("/api/dashboard")
        assert resp.status_code == 500
        assert json.loads(resp.data)["status"] == "error"
