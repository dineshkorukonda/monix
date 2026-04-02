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

from django.contrib.auth.models import User  # noqa: E402

from reports.models import Scan, Target  # noqa: E402


def _make_scan(
    url="https://example.com",
    score=20,
    results=None,
    *,
    is_expired=False,
    expires_at=None,
):
    exp = expires_at or (timezone.now() + timedelta(days=30))
    return Scan.objects.create(
        url=url,
        score=score,
        results=results or {"status": "success"},
        is_expired=is_expired,
        expires_at=exp,
    )


class ScanModelTest(TestCase):
    def test_string_includes_active_status(self):
        scan = _make_scan(is_expired=False)
        assert "active" in str(scan)

    def test_string_includes_expired_status(self):
        scan = _make_scan(is_expired=True)
        assert "expired" in str(scan)

    def test_ordering_newest_first(self):
        older = _make_scan(url="https://older.example.com")
        newer = _make_scan(url="https://newer.example.com")
        Scan.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(days=1))

        ordered_ids = list(Scan.objects.values_list("id", flat=True))
        assert ordered_ids == [newer.id, older.id]


class ExpireReportsCommandTest(TestCase):
    def test_command_marks_only_past_due_as_expired(self):
        overdue = _make_scan(
            url="https://old.example.com",
            expires_at=timezone.now() - timedelta(days=1),
        )
        fresh = _make_scan(
            url="https://fresh.example.com",
            expires_at=timezone.now() + timedelta(days=10),
        )
        already = _make_scan(
            url="https://expired.example.com",
            is_expired=True,
            expires_at=timezone.now() - timedelta(days=2),
        )

        out = StringIO()
        call_command("expire_reports", stdout=out)

        overdue.refresh_from_db()
        fresh.refresh_from_db()
        already.refresh_from_db()

        assert overdue.is_expired is True
        assert fresh.is_expired is False
        assert already.is_expired is True
        assert "Marked 1 report(s) as expired." in out.getvalue()

    def test_command_is_idempotent_when_nothing_is_due(self):
        _make_scan(
            url="https://future.example.com",
            expires_at=timezone.now() + timedelta(days=7),
        )

        out = StringIO()
        call_command("expire_reports", stdout=out)

        assert "Marked 0 report(s) as expired." in out.getvalue()


class TargetModelTest(TestCase):
    def test_str_contains_url_and_owner_hint(self):
        owner = User.objects.create_user(
            username="owner@example.com",
            email="owner@example.com",
            password="test-pass-11",
        )
        t = Target.objects.create(owner=owner, url="https://app.example.com/")
        s = str(t)
        assert "app.example.com" in s
        assert "owner@example.com" in s

    def test_ordering_newest_first(self):
        owner = User.objects.create_user(
            username="own2@example.com",
            email="own2@example.com",
            password="test-pass-22",
        )
        older = Target.objects.create(owner=owner, url="https://old.example.com")
        newer = Target.objects.create(owner=owner, url="https://new.example.com")
        Target.objects.filter(pk=older.pk).update(
            created_at=timezone.now() - timedelta(days=1)
        )

        ids = list(Target.objects.values_list("id", flat=True))
        assert ids == [newer.id, older.id]
