"""Tests for engine.collectors.system module."""

import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from engine.collectors.system import (
    get_system_stats,
    get_top_processes,
    get_disk_io,
    format_uptime,
    format_bytes
)


class TestFormatUptime:
    """Tests for format_uptime utility function."""
    
    def test_format_uptime_less_than_minute(self):
        """Test uptime formatting for less than a minute."""
        result = format_uptime(30)
        assert result == "<1m"
    
    def test_format_uptime_minutes(self):
        """Test uptime formatting for minutes only."""
        result = format_uptime(300)  # 5 minutes
        assert result == "5m"
    
    def test_format_uptime_hours_and_minutes(self):
        """Test uptime formatting for hours and minutes."""
        result = format_uptime(3900)  # 1 hour 5 minutes
        assert result == "1h 5m"
    
    def test_format_uptime_days_hours_minutes(self):
        """Test uptime formatting for days, hours, and minutes."""
        result = format_uptime(90000)  # 1 day 1 hour
        assert "1d" in result and "1h" in result


class TestFormatBytes:
    """Tests for format_bytes utility function."""
    
    def test_format_bytes_bytes(self):
        """Test byte formatting for bytes."""
        result = format_bytes(512)
        assert "512" in result and "B" in result
    
    def test_format_bytes_kilobytes(self):
        """Test byte formatting for kilobytes."""
        result = format_bytes(1024)
        assert "1.00 KB" == result
    
    def test_format_bytes_megabytes(self):
        """Test byte formatting for megabytes."""
        result = format_bytes(1048576)
        assert "1.00 MB" == result
    
    def test_format_bytes_gigabytes(self):
        """Test byte formatting for gigabytes."""
        result = format_bytes(1073741824)
        assert "1.00 GB" == result
    
    def test_format_bytes_terabytes(self):
        """Test byte formatting for terabytes."""
        result = format_bytes(1099511627776)
        assert "1.00 TB" == result


class TestGetSystemStats:
    """Tests for get_system_stats function."""
    
    @patch('engine.collectors.system.psutil')
    def test_get_system_stats_success(self, mock_psutil):
        """Test successful system stats collection."""
        # Mock psutil functions
        mock_psutil.cpu_percent.return_value = 45.5
        mock_psutil.virtual_memory.return_value = MagicMock(percent=60.2)
        mock_psutil.disk_usage.return_value = MagicMock(percent=75.3)
        mock_psutil.net_io_counters.return_value = MagicMock(
            bytes_sent=1000000,
            bytes_recv=2000000
        )
        mock_psutil.boot_time.return_value = 1000000000.0
        mock_psutil.pids.return_value = list(range(100))
        
        with patch('engine.collectors.system.time.time', return_value=1000001000.0):
            with patch('engine.collectors.system.os.getloadavg', return_value=(1.5, 1.2, 1.0)):
                stats = get_system_stats()
        
        # Verify stats structure
        assert 'cpu_percent' in stats
        assert 'memory_percent' in stats
        assert 'disk_percent' in stats
        assert 'network_sent' in stats
        assert 'network_recv' in stats
        assert 'uptime' in stats
        assert 'load_avg' in stats
        assert 'process_count' in stats
        assert 'timestamp' in stats
        
        # Verify values
        assert stats['cpu_percent'] == 45.5
        assert stats['memory_percent'] == 60.2
        assert stats['disk_percent'] == 75.3
        assert stats['network_sent'] == 1000000
        assert stats['network_recv'] == 2000000
        assert stats['process_count'] == 100
    
    @patch('engine.collectors.system.psutil')
    def test_get_system_stats_error_handling(self, mock_psutil):
        """Test error handling in system stats collection."""
        # Mock an exception
        mock_psutil.cpu_percent.side_effect = Exception("Test error")
        
        stats = get_system_stats()
        
        # Should return minimal stats with error
        assert 'error' in stats
        assert stats['cpu_percent'] == 0.0
        assert stats['memory_percent'] == 0.0


class TestGetTopProcesses:
    """Tests for get_top_processes function."""
    
    @patch('engine.collectors.system.psutil.process_iter')
    def test_get_top_processes_success(self, mock_process_iter):
        """Test successful top processes retrieval."""
        # Create mock processes
        mock_proc1 = MagicMock()
        mock_proc1.info = {'pid': 1, 'name': 'process1', 'cpu_percent': 0, 'memory_percent': 5.0}
        mock_proc1.cpu_percent.return_value = 50.0
        
        mock_proc2 = MagicMock()
        mock_proc2.info = {'pid': 2, 'name': 'process2', 'cpu_percent': 0, 'memory_percent': 3.0}
        mock_proc2.cpu_percent.return_value = 30.0
        
        mock_process_iter.return_value = [mock_proc1, mock_proc2]
        
        processes = get_top_processes(limit=10)
        
        # Verify results
        assert len(processes) == 2
        assert processes[0]['cpu_percent'] == 50.0
        assert processes[1]['cpu_percent'] == 30.0
        assert processes[0]['name'] == 'process1'
    
    @patch('engine.collectors.system.psutil.process_iter')
    def test_get_top_processes_limit(self, mock_process_iter):
        """Test top processes with limit parameter."""
        # Create mock processes
        mock_procs = []
        for i in range(20):
            mock_proc = MagicMock()
            mock_proc.info = {
                'pid': i, 
                'name': f'process{i}', 
                'cpu_percent': 0, 
                'memory_percent': 1.0
            }
            mock_proc.cpu_percent.return_value = float(i)
            mock_procs.append(mock_proc)
        
        mock_process_iter.return_value = mock_procs
        
        processes = get_top_processes(limit=5)
        
        # Should return only 5 processes
        assert len(processes) == 5
        # Should be sorted by CPU (highest first)
        assert processes[0]['cpu_percent'] >= processes[1]['cpu_percent']
    
    @patch('engine.collectors.system.psutil.process_iter')
    def test_get_top_processes_error_handling(self, mock_process_iter):
        """Test error handling in top processes retrieval."""
        mock_process_iter.side_effect = Exception("Test error")
        
        processes = get_top_processes()
        
        # Should return empty list on error
        assert processes == []


class TestGetDiskIO:
    """Tests for get_disk_io function."""
    
    @patch('engine.collectors.system.psutil.disk_io_counters')
    def test_get_disk_io_success(self, mock_disk_io):
        """Test successful disk I/O stats retrieval."""
        mock_disk_io.return_value = MagicMock(
            read_count=1000,
            write_count=500,
            read_bytes=1048576,
            write_bytes=524288,
            read_time=100,
            write_time=50
        )
        
        disk_io = get_disk_io()
        
        # Verify stats
        assert disk_io['read_count'] == 1000
        assert disk_io['write_count'] == 500
        assert disk_io['read_bytes'] == 1048576
        assert disk_io['write_bytes'] == 524288
    
    @patch('engine.collectors.system.psutil.disk_io_counters')
    def test_get_disk_io_none(self, mock_disk_io):
        """Test disk I/O when counters return None."""
        mock_disk_io.return_value = None
        
        disk_io = get_disk_io()
        
        # Should return empty dict
        assert disk_io == {}
    
    @patch('engine.collectors.system.psutil.disk_io_counters')
    def test_get_disk_io_error(self, mock_disk_io):
        """Test error handling in disk I/O retrieval."""
        mock_disk_io.side_effect = Exception("Test error")
        
        disk_io = get_disk_io()
        
        # Should return empty dict on error
        assert disk_io == {}
