"""Tests for api.monitoring.engine."""

from unittest.mock import patch

from api.monitoring import engine


def _conn(remote_ip="8.8.8.8", local_port=80, state="ESTABLISHED"):
    return {"remote_ip": remote_ip, "local_port": local_port, "state": state}


class TestDetectAttacks:
    @patch("api.monitoring.engine.state.add_alert")
    @patch("api.monitoring.engine.time.time", return_value=100.0)
    def test_detects_syn_flood_high_conn_and_port_scan(self, _mock_time, mock_add_alert):
        engine.port_activity.clear()
        conns = []
        conns.extend([_conn(remote_ip="9.9.9.9", state="SYN_RECV") for _ in range(100)])
        conns.extend([_conn(remote_ip="8.8.8.8", state="ESTABLISHED") for _ in range(50)])
        conns.extend(
            [
                _conn(remote_ip="7.7.7.7", state="ESTABLISHED", local_port=port)
                for port in range(1, 6)
            ]
        )

        engine.detect_attacks(conns)

        messages = [call.args[0] for call in mock_add_alert.call_args_list]
        assert any("SYN_FLOOD from 9.9.9.9" in message for message in messages)
        assert any("HIGH_CONN from 8.8.8.8" in message for message in messages)
        assert any("PORT_SCAN from 7.7.7.7" in message for message in messages)

    @patch("api.monitoring.engine.state.add_alert")
    @patch("api.monitoring.engine.time.time", return_value=100.0)
    def test_ignores_local_ips_for_port_scan_tracking(self, _mock_time, mock_add_alert):
        engine.port_activity.clear()

        engine.detect_attacks(
            [_conn(remote_ip="127.0.0.1", local_port=port) for port in range(1, 10)]
        )

        mock_add_alert.assert_not_called()


class TestStartMonitor:
    @patch("api.monitoring.engine.Thread")
    def test_start_monitor_starts_daemon_thread(self, mock_thread):
        engine.start_monitor()

        mock_thread.assert_called_once_with(target=engine.collector_loop, daemon=True)
        mock_thread.return_value.start.assert_called_once()
