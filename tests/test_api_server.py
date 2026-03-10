"""Tests for API server endpoints."""

import json
import pytest
from unittest.mock import patch, MagicMock
from api.server import app


@pytest.fixture
def client():
    """Flask test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get('/api/health')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'monix-api'


class TestAnalyzeUrlEndpoint:
    @patch('api.server.analyze_web_security')
    def test_success(self, mock_analyze, client):
        mock_analyze.return_value = {'url': 'https://example.com', 'status': 'success', 'threat_score': 10}
        resp = client.post('/api/analyze-url',
                           data=json.dumps({'url': 'https://example.com'}),
                           content_type='application/json')
        assert resp.status_code == 200
        assert json.loads(resp.data)['status'] == 'success'

    def test_missing_url_returns_400(self, client):
        resp = client.post('/api/analyze-url',
                           data=json.dumps({}),
                           content_type='application/json')
        assert resp.status_code == 400
        assert 'url' in json.loads(resp.data)['error'].lower()

    @patch('api.server.analyze_web_security')
    def test_exception_returns_500(self, mock_analyze, client):
        mock_analyze.side_effect = Exception('boom')
        resp = client.post('/api/analyze-url',
                           data=json.dumps({'url': 'https://example.com'}),
                           content_type='application/json')
        assert resp.status_code == 500
        assert json.loads(resp.data)['status'] == 'error'


class TestAnalyzeIpEndpoint:
    @patch('api.server.get_ip_info')
    def test_success(self, mock_info, client):
        mock_info.return_value = {'geo': 'US', 'hostname': 'dns.google'}
        resp = client.post('/api/analyze-ip',
                           data=json.dumps({'ip': '8.8.8.8'}),
                           content_type='application/json')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'success'
        assert data['ip'] == '8.8.8.8'


class TestThreatInfoEndpoint:
    def test_returns_lists(self, client):
        resp = client.get('/api/threat-info')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert isinstance(data['high_risk_endpoints'], list)
        assert isinstance(data['malicious_bot_signatures'], list)


class TestConnectionsEndpoint:
    @patch('api.server.collect_connections')
    def test_success(self, mock_collect, client):
        mock_collect.return_value = [{'local_ip': '127.0.0.1', 'state': 'ESTABLISHED'}]
        resp = client.get('/api/connections')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'success'
        assert data['count'] == 1


class TestAlertsEndpoint:
    @patch('api.server.state.snapshot')
    def test_success(self, mock_snap, client):
        mock_snap.return_value = ([], [{'type': 'SYN_FLOOD'}])
        resp = client.get('/api/alerts')
        assert resp.status_code == 200
        assert json.loads(resp.data)['count'] == 1


class TestSystemStatsEndpoint:
    @patch('api.server.get_system_stats')
    def test_success(self, mock_stats, client):
        mock_stats.return_value = {'cpu_percent': 10.0, 'memory_percent': 20.0}
        resp = client.get('/api/system-stats')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'success'
        assert data['cpu_percent'] == 10.0


class TestDashboardEndpoint:
    @patch('api.server.collect_connections')
    @patch('api.server.state.snapshot')
    @patch('api.server.get_system_stats')
    @patch('api.server.get_traffic_summary')
    def test_success(self, mock_traffic, mock_stats, mock_snap, mock_conns, client):
        mock_conns.return_value = []
        mock_snap.return_value = ([], [])
        mock_stats.return_value = {'cpu_percent': 5.0}
        mock_traffic.return_value = {
            'total_requests': 10, 'unique_ips': 5,
            'total_404s': 1, 'high_risk_hits': 0, 'suspicious_ips': []
        }
        resp = client.get('/api/dashboard')
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data['status'] == 'success'
        assert 'traffic_summary' in data

    @patch('api.server.collect_connections')
    @patch('api.server.state.snapshot')
    @patch('api.server.get_system_stats')
    @patch('api.server.get_traffic_summary')
    def test_traffic_error_falls_back_to_defaults(self, mock_traffic, mock_stats, mock_snap, mock_conns, client):
        mock_conns.return_value = []
        mock_snap.return_value = ([], [])
        mock_stats.return_value = {'cpu_percent': 5.0}
        mock_traffic.side_effect = Exception('log unavailable')
        resp = client.get('/api/dashboard')
        assert resp.status_code == 200
        assert json.loads(resp.data)['traffic_summary']['total_requests'] == 0
