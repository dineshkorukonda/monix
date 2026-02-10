"""Tests for API server endpoints."""

import pytest
import json
from unittest.mock import patch, MagicMock
from api.server import app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    """Tests for /api/health endpoint."""
    
    def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert data['service'] == 'monix-api'


class TestAnalyzeUrlEndpoint:
    """Tests for /api/analyze-url endpoint."""
    
    @patch('api.server.analyze_web_security')
    def test_analyze_url_endpoint_success(self, mock_analyze, client):
        """Test successful URL analysis."""
        mock_analyze.return_value = {
            'url': 'https://example.com',
            'status': 'success',
            'threat_score': 10,
            'threat_level': 'LOW'
        }
        
        response = client.post(
            '/api/analyze-url',
            data=json.dumps({'url': 'https://example.com'}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['url'] == 'https://example.com'
    
    def test_analyze_url_endpoint_missing_url(self, client):
        """Test analyze URL with missing URL parameter."""
        response = client.post(
            '/api/analyze-url',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'
        assert 'url' in data['error'].lower()
    
    @patch('api.server.analyze_web_security')
    def test_analyze_url_endpoint_with_options(self, mock_analyze, client):
        """Test URL analysis with optional parameters."""
        mock_analyze.return_value = {
            'url': 'https://example.com',
            'status': 'success',
            'port_scan': {'open_ports': [80, 443]}
        }
        
        response = client.post(
            '/api/analyze-url',
            data=json.dumps({
                'url': 'https://example.com',
                'include_port_scan': True,
                'include_metadata': True
            }),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        # Verify that the mock was called with the right parameters
        mock_analyze.assert_called_once_with(
            'https://example.com',
            include_port_scan=True,
            include_metadata=True
        )
    
    @patch('api.server.analyze_web_security')
    def test_analyze_url_endpoint_full_scan(self, mock_analyze, client):
        """Test full scan using query parameter."""
        mock_analyze.return_value = {
            'url': 'https://example.com',
            'status': 'success'
        }
        
        response = client.post(
            '/api/analyze-url?full=true',
            data=json.dumps({'url': 'https://example.com'}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        # Verify full scan parameters were used
        mock_analyze.assert_called_once_with(
            'https://example.com',
            include_port_scan=True,
            include_metadata=True
        )
    
    @patch('api.server.analyze_web_security')
    def test_analyze_url_endpoint_error(self, mock_analyze, client):
        """Test error handling in URL analysis."""
        mock_analyze.side_effect = Exception('Analysis failed')
        
        response = client.post(
            '/api/analyze-url',
            data=json.dumps({'url': 'https://example.com'}),
            content_type='application/json'
        )
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestAnalyzeIpEndpoint:
    """Tests for /api/analyze-ip endpoint."""
    
    @patch('api.server.get_ip_info')
    def test_analyze_ip_endpoint_success(self, mock_get_ip_info, client):
        """Test successful IP analysis."""
        mock_get_ip_info.return_value = {
            'geo': 'United States',
            'hostname': 'example.com'
        }
        
        response = client.post(
            '/api/analyze-ip',
            data=json.dumps({'ip': '8.8.8.8'}),
            content_type='application/json'
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['ip'] == '8.8.8.8'
        assert 'geo_info' in data
    
    def test_analyze_ip_endpoint_missing_ip(self, client):
        """Test analyze IP with missing IP parameter."""
        response = client.post(
            '/api/analyze-ip',
            data=json.dumps({}),
            content_type='application/json'
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestThreatInfoEndpoint:
    """Tests for /api/threat-info endpoint."""
    
    def test_threat_info_endpoint(self, client):
        """Test threat information endpoint."""
        response = client.get('/api/threat-info')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'high_risk_endpoints' in data
        assert 'malicious_bot_signatures' in data
        assert isinstance(data['high_risk_endpoints'], list)
        assert isinstance(data['malicious_bot_signatures'], list)


class TestConnectionsEndpoint:
    """Tests for /api/connections endpoint."""
    
    @patch('api.server.collect_connections')
    def test_connections_endpoint_success(self, mock_collect, client):
        """Test successful connections retrieval."""
        mock_collect.return_value = [
            {'local_ip': '127.0.0.1', 'local_port': 22, 'state': 'ESTABLISHED'},
            {'local_ip': '192.168.1.100', 'local_port': 80, 'state': 'LISTENING'}
        ]
        
        response = client.get('/api/connections')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['count'] == 2
        assert len(data['connections']) == 2
    
    @patch('api.server.collect_connections')
    def test_connections_endpoint_error(self, mock_collect, client):
        """Test error handling in connections endpoint."""
        mock_collect.side_effect = Exception('Connection collection failed')
        
        response = client.get('/api/connections')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestAlertsEndpoint:
    """Tests for /api/alerts endpoint."""
    
    @patch('api.server.state.snapshot')
    def test_alerts_endpoint_success(self, mock_snapshot, client):
        """Test successful alerts retrieval."""
        mock_snapshot.return_value = (
            [],  # connections
            [
                {'type': 'SYN_FLOOD', 'ip': '10.0.0.1'},
                {'type': 'PORT_SCAN', 'ip': '10.0.0.2'}
            ]
        )
        
        response = client.get('/api/alerts')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['count'] == 2
        assert len(data['alerts']) == 2
    
    @patch('api.server.state.snapshot')
    def test_alerts_endpoint_empty(self, mock_snapshot, client):
        """Test alerts endpoint with no alerts."""
        mock_snapshot.return_value = ([], [])
        
        response = client.get('/api/alerts')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['count'] == 0


class TestSystemStatsEndpoint:
    """Tests for /api/system-stats endpoint."""
    
    @patch('api.server.get_system_stats')
    def test_system_stats_endpoint_success(self, mock_stats, client):
        """Test successful system stats retrieval."""
        mock_stats.return_value = {
            'cpu_percent': 45.5,
            'memory_percent': 60.2,
            'disk_percent': 75.3,
            'uptime': 86400
        }
        
        response = client.get('/api/system-stats')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['cpu_percent'] == 45.5
        assert data['memory_percent'] == 60.2
    
    @patch('api.server.get_system_stats')
    def test_system_stats_endpoint_error(self, mock_stats, client):
        """Test error handling in system stats endpoint."""
        mock_stats.side_effect = Exception('Stats collection failed')
        
        response = client.get('/api/system-stats')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['status'] == 'error'


class TestProcessesEndpoint:
    """Tests for /api/processes endpoint."""
    
    @patch('api.server.get_top_processes')
    def test_processes_endpoint_default(self, mock_processes, client):
        """Test processes endpoint with default limit."""
        mock_processes.return_value = [
            {'pid': 1, 'name': 'systemd', 'cpu_percent': 50.0},
            {'pid': 2, 'name': 'nginx', 'cpu_percent': 30.0}
        ]
        
        response = client.get('/api/processes')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert data['count'] == 2
        mock_processes.assert_called_once_with(limit=10)
    
    @patch('api.server.get_top_processes')
    def test_processes_endpoint_custom_limit(self, mock_processes, client):
        """Test processes endpoint with custom limit."""
        mock_processes.return_value = []
        
        response = client.get('/api/processes?limit=5')
        
        assert response.status_code == 200
        mock_processes.assert_called_once_with(limit=5)


class TestDashboardEndpoint:
    """Tests for /api/dashboard endpoint."""
    
    @patch('api.server.collect_connections')
    @patch('api.server.state.snapshot')
    @patch('api.server.get_system_stats')
    @patch('api.server.get_traffic_summary')
    def test_dashboard_endpoint_success(
        self, mock_traffic, mock_stats, mock_snapshot, mock_connections, client
    ):
        """Test successful dashboard data retrieval."""
        mock_connections.return_value = [
            {'local_ip': '127.0.0.1', 'state': 'ESTABLISHED'}
        ]
        mock_snapshot.return_value = ([], [{'type': 'alert1'}])
        mock_stats.return_value = {
            'cpu_percent': 45.5,
            'memory_percent': 60.2
        }
        mock_traffic.return_value = {
            'total_requests': 100,
            'unique_ips': 50,
            'total_404s': 10,
            'high_risk_hits': 5,
            'suspicious_ips': []
        }
        
        response = client.get('/api/dashboard')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        assert 'connections' in data
        assert 'alerts' in data
        assert 'system_stats' in data
        assert 'traffic_summary' in data
    
    @patch('api.server.collect_connections')
    @patch('api.server.state.snapshot')
    @patch('api.server.get_system_stats')
    @patch('api.server.get_traffic_summary')
    def test_dashboard_endpoint_traffic_error(
        self, mock_traffic, mock_stats, mock_snapshot, mock_connections, client
    ):
        """Test dashboard when traffic summary fails."""
        mock_connections.return_value = []
        mock_snapshot.return_value = ([], [])
        mock_stats.return_value = {'cpu_percent': 45.5}
        mock_traffic.side_effect = Exception('Traffic error')
        
        response = client.get('/api/dashboard')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'success'
        # Should have default traffic summary
        assert data['traffic_summary']['total_requests'] == 0
        assert data['traffic_summary']['unique_ips'] == 0
