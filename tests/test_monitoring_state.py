"""Tests for api.monitoring.state."""

from datetime import datetime, timedelta
from unittest.mock import patch

from api.monitoring.state import GlobalState


class TestGlobalState:
    def test_snapshot_returns_copies(self):
        state = GlobalState()
        state.update_connections([{"id": 1}])
        state.update_traffic({"total_requests": 3})
        state.add_alert("hello")

        connections, alerts = state.snapshot()
        full_connections, full_alerts, traffic = state.full_snapshot()

        connections.append({"id": 2})
        alerts.append("extra")
        traffic["total_requests"] = 0

        assert len(state.connections) == 1
        assert len(state.alerts) == 1
        assert state.traffic_summary["total_requests"] == 3
        assert len(full_connections) == 1
        assert len(full_alerts) == 1

    def test_add_alert_rate_limits_duplicate_keys(self):
        state = GlobalState()
        fixed_now = datetime(2026, 1, 1, 12, 0, 0)

        with patch("api.monitoring.state.datetime") as mock_datetime:
            mock_datetime.now.side_effect = [
                fixed_now,
                fixed_now + timedelta(seconds=30),
                fixed_now + timedelta(seconds=61),
            ]
            state.add_alert("first", key="dup")
            state.add_alert("second", key="dup")
            state.add_alert("third", key="dup")

        assert len(state.alerts) == 2
        assert "third" in state.alerts[0]
        assert "first" in state.alerts[1]

    def test_add_alert_keeps_only_latest_20(self):
        state = GlobalState()

        for i in range(25):
            state.add_alert(f"alert-{i}")

        assert len(state.alerts) == 20
        assert "alert-24" in state.alerts[0]
        assert all("alert-0" not in alert for alert in state.alerts)
