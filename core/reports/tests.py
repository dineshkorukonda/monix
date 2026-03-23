from datetime import timedelta

from django.contrib.admin.sites import AdminSite
from django.contrib.auth.models import User
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory, TestCase
from django.utils import timezone

from .admin import ReportAdmin, ScanAdmin, ScoreRangeFilter, delete_old_scans, mark_reports_as_expired
from .models import Report, Scan


def _make_scan(url="https://example.com", score=10, days_old=0):
    scan = Scan.objects.create(url=url, score=score, results={})
    if days_old:
        Scan.objects.filter(pk=scan.pk).update(
            created_at=timezone.now() - timedelta(days=days_old)
        )
        scan.refresh_from_db()
    return scan


def _make_report(scan, is_expired=False, days_until_expiry=30):
    return Report.objects.create(
        scan=scan,
        is_expired=is_expired,
        expires_at=timezone.now() + timedelta(days=days_until_expiry),
    )


def _request_with_messages(factory, path="/"):
    """Return a GET request with messages middleware storage attached."""
    request = factory.get(path)
    setattr(request, "session", "session")
    setattr(request, "_messages", FallbackStorage(request))
    return request


class ScanAdminListDisplayTest(TestCase):
    def test_list_display(self):
        admin_instance = ScanAdmin(Scan, AdminSite())
        self.assertEqual(admin_instance.list_display, ("url", "score", "created_at", "report_id"))


class ScoreRangeFilterTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.safe_scan = _make_scan(score=10)   # safe
        self.low_scan = _make_scan(score=40)    # low
        self.med_scan = _make_scan(score=60)    # medium
        self.high_scan = _make_scan(score=90)   # high

    def _apply(self, value):
        # Django's ChangeList passes request.GET (a mutable QueryDict) as params.
        # SimpleListFilter does params.pop() which returns a list on QueryDict,
        # then takes [-1]. We must pass a mutable QueryDict copy, not a plain dict.
        request = self.factory.get("/", {"score_range": value})
        params = request.GET.copy()  # mutable QueryDict
        f = ScoreRangeFilter(request, params, Scan, ScanAdmin(Scan, AdminSite()))
        return list(f.queryset(None, Scan.objects.all()).values_list("score", flat=True))

    def test_safe_band(self):
        scores = self._apply("safe")
        self.assertIn(10, scores)
        self.assertNotIn(40, scores)
        self.assertNotIn(90, scores)

    def test_low_band(self):
        scores = self._apply("low")
        self.assertIn(40, scores)
        self.assertNotIn(10, scores)
        self.assertNotIn(90, scores)

    def test_medium_band(self):
        scores = self._apply("medium")
        self.assertIn(60, scores)
        self.assertNotIn(10, scores)

    def test_high_band(self):
        scores = self._apply("high")
        self.assertIn(90, scores)
        self.assertNotIn(10, scores)

    def test_unknown_band_returns_all(self):
        scores = self._apply("unknown")
        self.assertEqual(len(scores), 4)


class DeleteOldScansActionTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = ScanAdmin(Scan, AdminSite())
        self.superuser = User.objects.create_superuser("admin", "a@b.com", "pass")

    def test_deletes_old_scans_only(self):
        old = _make_scan(days_old=31)
        new = _make_scan(days_old=1)
        request = _request_with_messages(self.factory)
        request.user = self.superuser
        delete_old_scans(self.admin, request, Scan.objects.all())
        self.assertFalse(Scan.objects.filter(pk=old.pk).exists())
        self.assertTrue(Scan.objects.filter(pk=new.pk).exists())


class ReportAdminListDisplayTest(TestCase):
    def test_list_display(self):
        admin_instance = ReportAdmin(Report, AdminSite())
        self.assertEqual(admin_instance.list_display, ("url", "is_expired", "expires_at"))

    def test_url_method_returns_scan_url(self):
        scan = _make_scan(url="https://test.example.com", score=5)
        report = _make_report(scan)
        admin_instance = ReportAdmin(Report, AdminSite())
        self.assertEqual(admin_instance.url(report), "https://test.example.com")


class MarkReportsExpiredActionTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin = ReportAdmin(Report, AdminSite())
        self.superuser = User.objects.create_superuser("admin2", "x@y.com", "pass")

    def test_marks_selected_reports_as_expired(self):
        scan = _make_scan()
        report = _make_report(scan, is_expired=False)
        request = _request_with_messages(self.factory)
        request.user = self.superuser
        mark_reports_as_expired(self.admin, request, Report.objects.all())
        report.refresh_from_db()
        self.assertTrue(report.is_expired)

