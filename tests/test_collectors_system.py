"""Tests for scan_engine.collectors.system module."""

from unittest.mock import patch, MagicMock

from scan_engine.collectors.system import (
    get_system_stats,
    get_top_processes,
    get_disk_io,
    format_uptime,
    format_bytes,
)


class TestFormatHelpers:
    """Smoke-tests for pure formatting utilities."""

    def test_format_uptime_under_one_minute(self):
        assert format_uptime(20) == "<1m"

    def test_format_uptime_composite(self):
        """Hours and minutes are both included when applicable."""
        assert format_uptime(3900) == "1h 5m"

    def test_format_uptime_includes_days(self):
        assert format_uptime(90061) == "1d 1h 1m"

    def test_format_bytes_bytes(self):
        assert format_bytes(512) == "512.00 B"

    def test_format_bytes_megabytes(self):
        assert format_bytes(1048576) == "1.00 MB"


class TestGetSystemStats:
    @patch("scan_engine.collectors.system.psutil")
    def test_success_returns_expected_fields(self, mock_psutil):
        mock_psutil.cpu_percent.return_value = 45.5
        mock_psutil.virtual_memory.return_value = MagicMock(percent=60.2)
        mock_psutil.disk_usage.return_value = MagicMock(percent=75.3)
        mock_psutil.net_io_counters.return_value = MagicMock(
            bytes_sent=1_000_000, bytes_recv=2_000_000
        )
        mock_psutil.boot_time.return_value = 1_000_000_000.0
        mock_psutil.pids.return_value = list(range(100))
        with patch("scan_engine.collectors.system.time.time", return_value=1_000_001_000.0):
            with patch("scan_engine.collectors.system.os.getloadavg", return_value=(1.5, 1.2, 1.0)):
                stats = get_system_stats()
        assert stats["cpu_percent"] == 45.5
        assert stats["memory_percent"] == 60.2
        assert stats["process_count"] == 100
        assert "timestamp" in stats

    @patch("scan_engine.collectors.system.psutil")
    def test_loadavg_unavailable_uses_zeroes(self, mock_psutil):
        mock_psutil.cpu_percent.return_value = 10.0
        mock_psutil.virtual_memory.return_value = MagicMock(percent=20.0)
        mock_psutil.disk_usage.return_value = MagicMock(percent=30.0)
        mock_psutil.net_io_counters.return_value = MagicMock(bytes_sent=10, bytes_recv=20)
        mock_psutil.boot_time.return_value = 1000.0
        mock_psutil.pids.return_value = [1, 2]

        with patch("scan_engine.collectors.system.time.time", return_value=1100.0):
            with patch("scan_engine.collectors.system.os.getloadavg", side_effect=OSError):
                stats = get_system_stats()

        assert stats["load_avg"] == [0.0, 0.0, 0.0]

    @patch("scan_engine.collectors.system.psutil")
    def test_error_returns_zero_defaults(self, mock_psutil):
        mock_psutil.cpu_percent.side_effect = Exception("fail")
        stats = get_system_stats()
        assert "error" in stats
        assert stats["cpu_percent"] == 0.0


class TestGetTopProcesses:
    @patch("scan_engine.collectors.system.psutil.process_iter")
    def test_sorted_by_cpu(self, mock_iter):
        p1, p2 = MagicMock(), MagicMock()
        p1.info = {"pid": 1, "name": "high", "cpu_percent": 0, "memory_percent": 1.0}
        p1.cpu_percent.return_value = 80.0
        p2.info = {"pid": 2, "name": "low", "cpu_percent": 0, "memory_percent": 1.0}
        p2.cpu_percent.return_value = 10.0
        mock_iter.return_value = [p1, p2]
        procs = get_top_processes(limit=10)
        assert procs[0]["cpu_percent"] == 80.0

    @patch("scan_engine.collectors.system.psutil.process_iter")
    def test_ignores_process_level_exceptions(self, mock_iter):
        broken = MagicMock()
        broken.info = {"pid": 1, "name": "broken", "cpu_percent": 0, "memory_percent": 1.0}
        broken.cpu_percent.side_effect = Exception("boom")

        healthy = MagicMock()
        healthy.info = {"pid": 2, "name": "healthy", "cpu_percent": 0, "memory_percent": 1.0}
        healthy.cpu_percent.return_value = 15.0

        mock_iter.return_value = [broken, healthy]

        procs = get_top_processes(limit=10)

        assert procs == [{"pid": 2, "name": "healthy", "cpu_percent": 15.0, "memory_percent": 1.0}]

    @patch("scan_engine.collectors.system.psutil.process_iter")
    def test_error_returns_empty_list(self, mock_iter):
        mock_iter.side_effect = Exception("fail")
        assert get_top_processes() == []


class TestGetDiskIO:
    @patch("scan_engine.collectors.system.psutil.disk_io_counters")
    def test_success(self, mock_io):
        mock_io.return_value = MagicMock(
            read_count=1000,
            write_count=500,
            read_bytes=1_048_576,
            write_bytes=524_288,
            read_time=100,
            write_time=50,
        )
        result = get_disk_io()
        assert result["read_count"] == 1000
        assert result["read_bytes"] == 1_048_576

    @patch("scan_engine.collectors.system.psutil.disk_io_counters", return_value=None)
    def test_none_counters_returns_empty_dict(self, _mock_io):
        assert get_disk_io() == {}

    @patch("scan_engine.collectors.system.psutil.disk_io_counters", side_effect=Exception("fail"))
    def test_error_returns_empty_dict(self, _mock_io):
        assert get_disk_io() == {}
