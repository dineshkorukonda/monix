"""Tests for ``reports.persistence`` — Django ORM scan persistence."""

import uuid

import pytest

from reports.models import Scan


@pytest.mark.django_db
class TestSaveScanResult:
    def test_persists_and_returns_report_id(self):
        from reports.persistence import save_scan_result

        rid = save_scan_result("https://example.com", 42, {"status": "ok"})
        assert rid is not None
        uuid.UUID(rid)
        scan = Scan.objects.get(report_id=rid)
        assert scan.score == 42
        assert scan.url == "https://example.com"
        assert scan.is_expired is False
        assert scan.expires_at is not None

    def test_clamps_score_below_zero(self):
        from reports.persistence import save_scan_result

        rid = save_scan_result("https://a.com", -10, {})
        scan = Scan.objects.get(report_id=rid)
        assert scan.score == 0

    def test_clamps_score_above_100(self):
        from reports.persistence import save_scan_result

        rid = save_scan_result("https://b.com", 150, {})
        scan = Scan.objects.get(report_id=rid)
        assert scan.score == 100

    def test_invalid_target_id_ignored(self):
        from reports.persistence import save_scan_result

        rid = save_scan_result("https://c.com", 50, {}, target_id="not-a-uuid")
        scan = Scan.objects.get(report_id=rid)
        assert scan.target_id is None


@pytest.mark.django_db
class TestAnalyzeUrlEndpointPersistence:
    @pytest.mark.parametrize("save_ret", [str(uuid.uuid4()), None])
    def test_report_id_in_response_matches_save(self, save_ret, client, monkeypatch):
        from reports import engine_views

        mock_result = {"url": "https://example.com", "status": "success", "threat_score": 20}

        def fake_run(*args, **kwargs):
            out = dict(mock_result)
            out["seo"] = {"seo_score": 0}
            out["performance"] = {"mobile": {}, "desktop": {}}
            out["lighthouse_ran"] = False
            out["scores"] = {"overall": 50, "security": 50, "seo": 50, "performance": 50}
            if save_ret:
                out["report_id"] = save_ret
                out["report_url"] = f"/dashboard/report/{save_ret}"
            return out

        monkeypatch.setattr(
            engine_views, "run_full_url_analysis", fake_run
        )

        resp = client.post(
            "/api/analyze-url",
            data='{"url": "https://example.com"}',
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        if save_ret:
            assert data.get("report_id") == save_ret
            assert data.get("report_url") == f"/dashboard/report/{save_ret}"
        else:
            assert "report_id" not in data
            assert "report_url" not in data
