"""
Tests for Django reports views.

Tests the ``GET /api/reports/<report_id>`` endpoint which returns a
shareable scan report JSON or 404 when missing / expired.
"""

import json
import os
import sys
import uuid
from datetime import timedelta
from unittest.mock import patch

import django

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import TestCase  # noqa: E402
from django.urls import reverse  # noqa: E402
from django.utils import timezone  # noqa: E402

from django.contrib.auth.models import User  # noqa: E402

from reports.models import Scan, Target  # noqa: E402


def _make_scan(
    url="https://example.com",
    score=20,
    results=None,
    *,
    is_expired=False,
    days_until_expiry=30,
):
    exp = timezone.now() + timedelta(days=days_until_expiry)
    return Scan.objects.create(
        url=url,
        score=score,
        results=results or {"status": "success"},
        is_expired=is_expired,
        expires_at=exp,
    )


class ReportDetailViewTest(TestCase):
    """Tests for GET /api/reports/<report_id>."""

    def _url(self, report_id):
        return reverse("report_detail", kwargs={"report_id": report_id})

    def test_returns_200_with_full_scan_data(self):
        """A valid, non-expired report returns 200 with scan results."""
        scan = _make_scan(url="https://good.example.com", score=15, results={"ok": True})

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
        """A scan with ``is_expired=True`` returns 404."""
        scan = _make_scan(is_expired=True)

        resp = self.client.get(self._url(scan.report_id))
        self.assertEqual(resp.status_code, 404)

    def test_returns_404_for_report_past_expiry_timestamp(self):
        """A scan whose ``expires_at`` timestamp is in the past returns 404."""
        scan = _make_scan(is_expired=False, days_until_expiry=-1)

        resp = self.client.get(self._url(scan.report_id))
        self.assertEqual(resp.status_code, 404)

    def test_only_get_method_allowed(self):
        """POST requests to the report endpoint are rejected with 405."""
        scan = _make_scan()

        resp = self.client.post(self._url(scan.report_id), data={}, content_type="application/json")
        self.assertEqual(resp.status_code, 405)


class ApiRunScanTest(TestCase):
    """Tests for POST /api/scans/run/ authenticated in-process scan."""

    def setUp(self):
        self.user = User.objects.create_user(
            "alice@example.com", "alice@example.com", "secret12345"
        )
        self.other = User.objects.create_user("bob@example.com", "bob@example.com", "secret12345")
        self.target = Target.objects.create(owner=self.user, url="https://mine.example.com")

    @patch("reports.views.run_full_url_analysis")
    def test_runs_scan_with_target(self, mock_run):
        mock_run.return_value = {"status": "success", "scores": {"overall": 80}}

        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps(
                {"url": "https://scan.example.com", "target_id": str(self.target.id)}
            ),
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        mock_run.assert_called_once()
        self.assertEqual(
            mock_run.call_args.kwargs.get("target_id"),
            str(self.target.id),
        )

    def test_requires_authentication(self):
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    @patch("reports.views.run_full_url_analysis")
    def test_rejects_target_owned_by_another_user(self, mock_run):
        foreign = Target.objects.create(owner=self.other, url="https://other.example.com")
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps({"url": "https://example.com", "target_id": str(foreign.id)}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)
        mock_run.assert_not_called()
