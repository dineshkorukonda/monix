"""Tests for engine.analyzers.threat module."""

import pytest
from engine.analyzers.threat import (
    analyze_connections,
    detect_threats
)


class TestAnalyzeConnections:
    """Tests for analyze_connections function."""
    
    def test_analyze_connections_empty(self):
        """Test analyzing empty connections list."""
        stats = analyze_connections([])
        
        assert stats['total'] == 0
        assert stats['established'] == 0
        assert stats['listening'] == 0
        assert stats['alerts_count'] == 0
    
    def test_analyze_connections_basic(self):
        """Test analyzing basic connections."""
        connections = [
            {'state': 'ESTABLISHED', 'pname': 'ssh', 'remote_ip': '192.168.1.100'},
            {'state': 'LISTEN', 'pname': 'nginx', 'remote_ip': '0.0.0.0'},
            {'state': 'TIME_WAIT', 'pname': 'firefox', 'remote_ip': '8.8.8.8'},
        ]
        
        stats = analyze_connections(connections)
        
        assert stats['total'] == 3
        assert stats['established'] == 1
        assert stats['listening'] == 1
        assert stats['time_wait'] == 1
        assert stats['syn_recv'] == 0
    
    def test_analyze_connections_process_counts(self):
        """Test process counting in connections."""
        connections = [
            {'state': 'ESTABLISHED', 'pname': 'ssh', 'remote_ip': '192.168.1.100'},
            {'state': 'ESTABLISHED', 'pname': 'ssh', 'remote_ip': '192.168.1.101'},
            {'state': 'ESTABLISHED', 'pname': 'nginx', 'remote_ip': '8.8.8.8'},
        ]
        
        stats = analyze_connections(connections)
        
        # Check top processes
        assert len(stats['top_processes']) > 0
        top_proc_names = [p[0] for p in stats['top_processes']]
        assert 'ssh' in top_proc_names
    
    def test_analyze_connections_remote_ips(self):
        """Test remote IP counting in connections."""
        connections = [
            {'state': 'ESTABLISHED', 'pname': 'ssh', 'remote_ip': '192.168.1.100'},
            {'state': 'ESTABLISHED', 'pname': 'ssh', 'remote_ip': '192.168.1.100'},
            {'state': 'ESTABLISHED', 'pname': 'nginx', 'remote_ip': '8.8.8.8'},
        ]
        
        stats = analyze_connections(connections)
        
        # Check top remote IPs
        assert len(stats['top_remote_ips']) > 0
        assert stats['top_remote_ips'][0][0] == '192.168.1.100'
        assert stats['top_remote_ips'][0][1] == 2


class TestDetectThreats:
    """Tests for detect_threats function."""
    
    def test_detect_threats_empty(self):
        """Test threat detection with empty connections."""
        threats = detect_threats([])
        assert threats == []
    
    def test_detect_threats_normal_traffic(self):
        """Test threat detection with normal traffic."""
        connections = [
            {'state': 'ESTABLISHED', 'remote_ip': '192.168.1.100', 'local_port': 22},
            {'state': 'ESTABLISHED', 'remote_ip': '192.168.1.101', 'local_port': 80},
        ]
        
        threats = detect_threats(connections)
        
        # Normal traffic should not trigger threats
        assert len(threats) == 0
    
    def test_detect_threats_syn_flood(self):
        """Test SYN flood detection."""
        # Create 50+ SYN_RECV connections from same IP
        connections = [
            {'state': 'SYN_RECV', 'remote_ip': '10.0.0.50', 'local_port': i}
            for i in range(55)
        ]
        
        threats = detect_threats(connections)
        
        # Should detect SYN flood
        assert len(threats) > 0
        assert any('SYN_FLOOD' in threat for threat in threats)
        assert any('10.0.0.50' in threat for threat in threats)
    
    def test_detect_threats_high_connections(self):
        """Test high connection count detection."""
        # Create 30+ established connections from same IP
        connections = [
            {'state': 'ESTABLISHED', 'remote_ip': '10.0.0.100', 'local_port': i}
            for i in range(35)
        ]
        
        threats = detect_threats(connections)
        
        # Should detect high connection count
        assert len(threats) > 0
        assert any('HIGH_CONN' in threat for threat in threats)
        assert any('10.0.0.100' in threat for threat in threats)
    
    def test_detect_threats_port_scan(self):
        """Test port scan detection."""
        # Create connections from same IP to 5+ different ports
        connections = [
            {'state': 'ESTABLISHED', 'remote_ip': '10.0.0.200', 'local_port': port}
            for port in [22, 80, 443, 3306, 8080, 9000]
        ]
        
        threats = detect_threats(connections)
        
        # Should detect port scan
        assert len(threats) > 0
        assert any('PORT_SCAN' in threat for threat in threats)
        assert any('10.0.0.200' in threat for threat in threats)
    
    def test_detect_threats_localhost_ignored(self):
        """Test that localhost connections are ignored."""
        # Create many connections from localhost
        connections = [
            {'state': 'SYN_RECV', 'remote_ip': '127.0.0.1', 'local_port': i}
            for i in range(100)
        ]
        
        threats = detect_threats(connections)
        
        # Localhost should not trigger threats
        assert len(threats) == 0
    
    def test_detect_threats_multiple_ips(self):
        """Test threat detection with multiple suspicious IPs."""
        connections = []
        
        # IP 1: SYN flood
        connections.extend([
            {'state': 'SYN_RECV', 'remote_ip': '10.0.0.1', 'local_port': i}
            for i in range(60)
        ])
        
        # IP 2: Port scan
        connections.extend([
            {'state': 'ESTABLISHED', 'remote_ip': '10.0.0.2', 'local_port': port}
            for port in [22, 80, 443, 3306, 8080, 9000]
        ])
        
        threats = detect_threats(connections)
        
        # Should detect both threats
        assert len(threats) >= 2
        syn_flood_found = any('SYN_FLOOD' in threat and '10.0.0.1' in threat for threat in threats)
        port_scan_found = any('PORT_SCAN' in threat and '10.0.0.2' in threat for threat in threats)
        assert syn_flood_found
        assert port_scan_found
