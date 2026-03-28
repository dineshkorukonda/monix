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
from unittest.mock import MagicMock, patch

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

from django.contrib.auth.models import User  # noqa: E402

from reports.models import Report, Scan, Target  # noqa: E402

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


class ApiRunScanProxyTest(TestCase):
    """Tests for POST /api/scans/run/ authenticated Flask proxy."""

    def setUp(self):
        self.user = User.objects.create_user(
            "alice@example.com", "alice@example.com", "secret12345"
        )
        self.other = User.objects.create_user("bob@example.com", "bob@example.com", "secret12345")
        self.target = Target.objects.create(owner=self.user, url="https://mine.example.com")

    @patch.dict(
        os.environ,
        {"MONIX_INTERNAL_SCAN_SECRET": "shared-secret", "FLASK_API_URL": "http://127.0.0.1:3030"},
    )
    @patch("reports.views.requests.post")
    def test_proxies_to_flask_with_internal_secret(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.content = b'{"status":"success"}'
        mock_resp.headers = {"Content-Type": "application/json"}
        mock_post.return_value = mock_resp

        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps(
                {"url": "https://scan.example.com", "target_id": str(self.target.id)}
            ),
            content_type="application/json",
        )

        self.assertEqual(resp.status_code, 200)
        mock_post.assert_called_once()
        self.assertEqual(
            mock_post.call_args.kwargs["headers"]["X-Monix-Internal-Scan-Secret"],
            "shared-secret",
        )
        self.assertEqual(
            mock_post.call_args.kwargs["json"]["target_id"],
            str(self.target.id),
        )

    def test_requires_authentication(self):
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 401)

    @patch.dict(os.environ, {"MONIX_INTERNAL_SCAN_SECRET": "x", "FLASK_API_URL": "http://127.0.0.1:3030"})
    @patch("reports.views.requests.post")
    def test_rejects_target_owned_by_another_user(self, mock_post):
        foreign = Target.objects.create(owner=self.other, url="https://other.example.com")
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps({"url": "https://example.com", "target_id": str(foreign.id)}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)
        mock_post.assert_not_called()

    @patch("reports.views.resolve_internal_scan_secret", return_value="")
    def test_missing_internal_secret_returns_503(self, _mock):
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api_run_scan"),
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 503)
