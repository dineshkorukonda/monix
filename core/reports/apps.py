import os
import sys

from django.apps import AppConfig


class ReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reports"

    def ready(self):
        if os.environ.get("DJANGO_SKIP_SCAN_MONITOR") == "1":
            return
        # When using ``runserver``, only start in the autoreloader child process.
        if "runserver" in sys.argv and os.environ.get("RUN_MAIN") != "true":
            return
        try:
            from scan_engine.monitoring.engine import start_monitor

            start_monitor()
        except Exception:
            pass
