from threading import Lock
from datetime import datetime
from typing import Dict, List, Any, Tuple


class GlobalState:
    """
    Thread-safe global state manager for Monix.
    
    Stores real-time data including network connections, security alerts,
    and traffic analysis results for dashboard display and monitoring.
    """
    
    def __init__(self):
        self.connections: List[Dict] = []
        self.alerts: List[str] = []
        self.last_alert_time: Dict[str, datetime] = {}
        self.traffic_summary: Dict[str, Any] = {}
        self.lock = Lock()

    def update_connections(self, conns: List[Dict]) -> None:
        """Update the current connections list."""
        with self.lock:
            self.connections = conns

    def add_alert(self, alert: str, key: str = None) -> None:
        """
        Add a security alert with rate limiting.
        
        Args:
            alert: Alert message
            key: Optional key for rate limiting duplicate alerts
        """
        now = datetime.now()
        timestamp = now.strftime("%H:%M:%S")
        
        with self.lock:
            if key:
                last_time = self.last_alert_time.get(key)
                if last_time and (now - last_time).total_seconds() < 60:
                    return
                self.last_alert_time[key] = now

            self.alerts.insert(0, f"{timestamp} — {alert}")
            self.alerts = self.alerts[:20]

    def update_traffic(self, summary: Dict[str, Any]) -> None:
        """
        Update the traffic analysis summary.
        
        Args:
            summary: Traffic analysis results from core.traffic
        """
        with self.lock:
            self.traffic_summary = summary

    def get_traffic(self) -> Dict[str, Any]:
        """Get the current traffic analysis summary."""
        with self.lock:
            return dict(self.traffic_summary)

    def snapshot(self) -> Tuple[List[Dict], List[str]]:
        """Get a snapshot of current connections and alerts."""
        with self.lock:
            return list(self.connections), list(self.alerts)

    def full_snapshot(self) -> Tuple[List[Dict], List[str], Dict[str, Any]]:
        """Get a full snapshot including traffic data."""
        with self.lock:
            return list(self.connections), list(self.alerts), dict(self.traffic_summary)


state = GlobalState()
