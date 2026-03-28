"""
Tests for Django report expiry behavior and management commands.
"""

import os
import sys
from datetime import timedelta
from io import StringIO

import django

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.management import call_command  # noqa: E402
from django.test import TestCase  # noqa: E402
from django.utils import timezone  # noqa: E402

from reports.models import Report, Scan  # noqa: E402


def _make_scan(url="https://example.com", score=20, results=None):
    return Scan.objects.create(url=url, score=score, results=results or {"status": "success"})


def _make_report(scan, is_expired=False, expires_at=None):
    return Report.objects.create(
        scan=scan,
        is_expired=is_expired,
        expires_at=expires_at or (timezone.now() + timedelta(days=30)),
    )


class ReportModelTest(TestCase):
    def test_report_string_includes_active_status(self):
        scan = _make_scan()
        report = _make_report(scan)

        assert "active" in str(report)

    def test_report_string_includes_expired_status(self):
        scan = _make_scan()
        report = _make_report(scan, is_expired=True)

        assert "expired" in str(report)

    def test_report_ordering_uses_newest_scan_first(self):
        older_scan = _make_scan(url="https://older.example.com")
        newer_scan = _make_scan(url="https://newer.example.com")

        older_report = _make_report(older_scan)
        newer_report = _make_report(newer_scan)

        Scan.objects.filter(pk=older_scan.pk).update(created_at=timezone.now() - timedelta(days=1))

        ordered_ids = list(Report.objects.values_list("id", flat=True))
        assert ordered_ids == [newer_report.id, older_report.id]


class ExpireReportsCommandTest(TestCase):
    def test_command_marks_only_past_due_reports_as_expired(self):
        overdue_report = _make_report(
            _make_scan(url="https://old.example.com"),
            expires_at=timezone.now() - timedelta(days=1),
        )
        fresh_report = _make_report(
            _make_scan(url="https://fresh.example.com"),
            expires_at=timezone.now() + timedelta(days=10),
        )
        already_expired = _make_report(
            _make_scan(url="https://expired.example.com"),
            is_expired=True,
            expires_at=timezone.now() - timedelta(days=2),
        )

        out = StringIO()
        call_command("expire_reports", stdout=out)

        overdue_report.refresh_from_db()
        fresh_report.refresh_from_db()
        already_expired.refresh_from_db()

        assert overdue_report.is_expired is True
        assert fresh_report.is_expired is False
        assert already_expired.is_expired is True
        assert "Marked 1 report(s) as expired." in out.getvalue()

    def test_command_is_idempotent_when_nothing_is_due(self):
        _make_report(
            _make_scan(url="https://future.example.com"),
            expires_at=timezone.now() + timedelta(days=7),
        )

        out = StringIO()
        call_command("expire_reports", stdout=out)

        assert "Marked 0 report(s) as expired." in out.getvalue()
