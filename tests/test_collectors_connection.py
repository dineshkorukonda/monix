"""Tests for scan_engine.collectors.connection."""

from types import SimpleNamespace
from unittest.mock import mock_open, patch

from scan_engine.collectors.connection import collect_connections


class TestCollectConnectionsProcfs:
    @patch("scan_engine.collectors.connection.reverse_dns", return_value="example.com")
    @patch("scan_engine.collectors.connection.geo_lookup", return_value="US")
    @patch(
        "scan_engine.collectors.connection.get_process_map",
        return_value={("127.0.0.1", 53): (123, "dnsmasq")},
    )
    @patch("scan_engine.collectors.connection.hex_port")
    @patch("scan_engine.collectors.connection.hex_ip")
    def test_reads_procfs_connections(
        self,
        mock_hex_ip,
        mock_hex_port,
        _mock_process_map,
        mock_geo,
        mock_dns,
    ):
        line = "0: 0100007F:0035 08080808:01BB 01 00000000:00000000 00:00000000 00000000 0 0 0 0 0 0 0 0\n"
        mock_hex_ip.side_effect = ["127.0.0.1", "8.8.8.8"]
        mock_hex_port.side_effect = [53, 443]

        with patch(
            "scan_engine.collectors.connection.os.path.exists",
            side_effect=lambda path: path == "/proc/net/tcp",
        ):
            with patch("builtins.open", mock_open(read_data=f"header\n{line}")):
                connections = collect_connections()

        assert len(connections) == 1
        assert connections[0]["local_ip"] == "127.0.0.1"
        assert connections[0]["remote_ip"] == "8.8.8.8"
        assert connections[0]["state"] == "ESTABLISHED"
        assert connections[0]["pid"] == 123
        assert connections[0]["pname"] == "dnsmasq"
        assert connections[0]["geo"] == "US"
        assert connections[0]["domain"] == "example.com"
        mock_geo.assert_called_once_with("8.8.8.8")
        mock_dns.assert_called_once_with("8.8.8.8")

    @patch("scan_engine.collectors.connection.get_process_map", return_value={})
    @patch("scan_engine.collectors.connection.hex_port", side_effect=[80, 0])
    @patch("scan_engine.collectors.connection.hex_ip", side_effect=["127.0.0.1", "0.0.0.0"])
    def test_skips_geo_lookup_for_local_or_unspecified_ips(
        self,
        _mock_hex_ip,
        _mock_hex_port,
        _mock_process_map,
    ):
        line = "0: 0100007F:0050 00000000:0000 01 00000000:00000000 00:00000000 00000000 0 0 0 0 0 0 0 0\n"

        with patch(
            "scan_engine.collectors.connection.os.path.exists",
            side_effect=lambda path: path == "/proc/net/tcp",
        ):
            with patch("builtins.open", mock_open(read_data=f"header\n{line}")):
                with patch("scan_engine.collectors.connection.geo_lookup") as mock_geo:
                    with patch("scan_engine.collectors.connection.reverse_dns") as mock_dns:
                        connections = collect_connections()

        assert connections[0]["geo"] == ""
        assert connections[0]["domain"] == ""
        mock_geo.assert_not_called()
        mock_dns.assert_not_called()

    @patch("scan_engine.collectors.connection.get_process_map", return_value={})
    def test_procfs_read_errors_are_ignored(self, _mock_process_map):
        with patch(
            "scan_engine.collectors.connection.os.path.exists",
            side_effect=lambda path: path == "/proc/net/tcp",
        ):
            with patch("builtins.open", side_effect=OSError("boom")):
                assert collect_connections() == []


class TestCollectConnectionsPsutilFallback:
    @patch("scan_engine.collectors.connection.reverse_dns", return_value="dns.google")
    @patch("scan_engine.collectors.connection.geo_lookup", return_value="US")
    @patch("scan_engine.collectors.connection.psutil.Process")
    @patch("scan_engine.collectors.connection.psutil.net_connections")
    def test_falls_back_to_psutil_when_procfs_missing(
        self,
        mock_net_connections,
        mock_process,
        mock_geo,
        mock_dns,
    ):
        mock_process.return_value.name.return_value = "python"
        mock_net_connections.return_value = [
            SimpleNamespace(
                laddr=SimpleNamespace(ip="10.0.0.5", port=5000),
                raddr=SimpleNamespace(ip="8.8.8.8", port=443),
                status="ESTABLISHED",
                pid=999,
            )
        ]

        with patch("scan_engine.collectors.connection.os.path.exists", return_value=False):
            connections = collect_connections()

        assert len(connections) == 1
        assert connections[0]["pname"] == "python"
        assert connections[0]["geo"] == "US"
        assert connections[0]["domain"] == "dns.google"
        mock_geo.assert_called_once_with("8.8.8.8")
        mock_dns.assert_called_once_with("8.8.8.8")

    @patch("scan_engine.collectors.connection.psutil.Process")
    @patch("scan_engine.collectors.connection.psutil.net_connections")
    def test_psutil_process_lookup_failure_is_non_fatal(self, mock_net_connections, mock_process):
        mock_process.side_effect = Exception("no process")
        mock_net_connections.return_value = [
            SimpleNamespace(
                laddr=SimpleNamespace(ip="10.0.0.5", port=5000),
                raddr=SimpleNamespace(ip="", port=0),
                status="ESTABLISHED",
                pid=999,
            )
        ]

        with patch("scan_engine.collectors.connection.os.path.exists", return_value=False):
            connections = collect_connections()

        assert connections[0]["pname"] == ""

    @patch("scan_engine.collectors.connection.psutil.net_connections", side_effect=RuntimeError("fail"))
    def test_psutil_failure_returns_empty_list(self, _mock_connections):
        with patch("scan_engine.collectors.connection.os.path.exists", return_value=False):
            assert collect_connections() == []
