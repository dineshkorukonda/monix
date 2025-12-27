from threading import Lock
from datetime import datetime

class GlobalState:
    def __init__(self):
        self.connections = []
        self.alerts = []
        self.last_alert_time = {}
        self.lock = Lock()

    def update_connections(self, conns):
        with self.lock:
            self.connections = conns

    def add_alert(self, alert, key=None):
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

    def snapshot(self):
        with self.lock:
            return list(self.connections), list(self.alerts)

state = GlobalState()
