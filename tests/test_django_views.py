"""
Tests for Django reports views.

Tests the ``GET /api/reports/<report_id>`` endpoint which returns a
shareable scan report JSON or 404 when missing / expired.
"""

import os
import sys
import uuid
from datetime import timedelta

import django

# ---------------------------------------------------------------------------
# Django setup — must happen before any Django imports
# ---------------------------------------------------------------------------

# Add the Django project root to sys.path so ``core`` and ``reports`` are importable.
_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# ---------------------------------------------------------------------------
# Standard Django test imports (after setup)
# ---------------------------------------------------------------------------

from django.test import TestCase  # noqa: E402
from django.urls import reverse  # noqa: E402
from django.utils import timezone  # noqa: E402

from reports.models import Report, Scan  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_scan(url="https://example.com", score=20, results=None):
    return Scan.objects.create(url=url, score=score, results=results or {"status": "success"})


def _make_report(scan, is_expired=False, days_until_expiry=30):
    return Report.objects.create(
        scan=scan,
        is_expired=is_expired,
        expires_at=timezone.now() + timedelta(days=days_until_expiry),
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class ReportDetailViewTest(TestCase):
    """Tests for GET /api/reports/<report_id>."""

    def _url(self, report_id):
        return reverse("report_detail", kwargs={"report_id": report_id})

    def test_returns_200_with_full_scan_data(self):
        """A valid, non-expired report returns 200 with scan results."""
        scan = _make_scan(url="https://good.example.com", score=15, results={"ok": True})
        _make_report(scan)

        resp = self.client.get(self._url(scan.report_id))

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["report_id"], str(scan.report_id))
        self.assertEqual(data["url"], "https://good.example.com")
        self.assertEqual(data["score"], 15)
        self.assertIn("created_at", data)
        self.assertIn("expires_at", data)
        self.assertEqual(data["results"], {"ok": True})

    def test_returns_404_for_unknown_report_id(self):
        """A random UUID that does not exist in the database returns 404."""
        missing_id = uuid.uuid4()
        resp = self.client.get(self._url(missing_id))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_report_flagged_as_expired(self):
        """A report with ``is_expired=True`` returns 404."""
        scan = _make_scan()
        _make_report(scan, is_expired=True)

        resp = self.client.get(self._url(scan.report_id))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_report_past_expiry_timestamp(self):
        """A report whose ``expires_at`` timestamp is in the past returns 404."""
        scan = _make_scan()
        _make_report(scan, is_expired=False, days_until_expiry=-1)

        resp = self.client.get(self._url(scan.report_id))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_when_scan_has_no_report_record(self):
        """A Scan with no associated Report record returns 404."""
        scan = _make_scan()
        # Intentionally do not create a Report for this scan.

        resp = self.client.get(self._url(scan.report_id))
        self.assertEqual(resp.status_code, 404)

    def test_only_get_method_allowed(self):
        """POST requests to the report endpoint are rejected with 405."""
        scan = _make_scan()
        _make_report(scan)

        resp = self.client.post(self._url(scan.report_id), data={}, content_type="application/json")
        self.assertEqual(resp.status_code, 405)
