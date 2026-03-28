"""
Tests for api/db.py — SQLAlchemy persistence layer.

All tests exercise the public ``save_scan`` function.  Database calls are
mocked so the test suite runs without a live PostgreSQL instance.
"""

import json
import uuid
from unittest.mock import MagicMock, patch

from api.server import app


class TestSaveScanNoDatabaseUrl:
    """save_scan should be a silent no-op when DATABASE_URL is absent."""

    def test_returns_none_without_database_url(self):
        """When _SessionLocal is None (no DATABASE_URL), save_scan returns None."""
        with patch("api.db._SessionLocal", None):
            from api.db import save_scan

            result = save_scan(url="https://example.com", score=10, results={"status": "success"})
        assert result is None


class TestSaveScanWithDatabase:
    """save_scan should persist a ScanRecord and ReportRecord and return a UUID string."""

    def _make_session_mock(self):
        """Return a mock that behaves like an SQLAlchemy session context manager."""
        session = MagicMock()
        session.__enter__ = MagicMock(return_value=session)
        session.__exit__ = MagicMock(return_value=False)

        # flush() assigns an id to the scan; simulate that here
        def fake_flush():
            pass

        session.flush.side_effect = fake_flush
        return session

    def test_returns_uuid_string_on_success(self):
        """save_scan returns a valid UUID string when the database write succeeds."""
        session_mock = self._make_session_mock()
        session_factory = MagicMock(return_value=session_mock)
        added_objects = []
        session_mock.add.side_effect = added_objects.append

        with patch("api.db._SessionLocal", session_factory):
            from api.db import save_scan

            result = save_scan(url="https://example.com", score=42, results={"status": "ok"})

        assert result is not None
        # Must be a valid UUID
        parsed = uuid.UUID(result)
        assert str(parsed) == result
        scan_record, report_record = added_objects
        ttl = report_record.expires_at - scan_record.created_at
        assert ttl.days == 30
        assert report_record.is_expired is False

    def test_clamps_score_below_zero(self):
        """Scores below 0 are clamped to 0 before storing."""
        session_mock = self._make_session_mock()
        session_factory = MagicMock(return_value=session_mock)
        added_objects = []
        session_mock.add.side_effect = added_objects.append

        with patch("api.db._SessionLocal", session_factory):
            from api.db import save_scan

            save_scan(url="https://example.com", score=-10, results={})

        scan_record = added_objects[0]
        assert scan_record.score == 0

    def test_clamps_score_above_100(self):
        """Scores above 100 are clamped to 100 before storing."""
        session_mock = self._make_session_mock()
        session_factory = MagicMock(return_value=session_mock)
        added_objects = []
        session_mock.add.side_effect = added_objects.append

        with patch("api.db._SessionLocal", session_factory):
            from api.db import save_scan

            save_scan(url="https://example.com", score=150, results={})

        scan_record = added_objects[0]
        assert scan_record.score == 100

    def test_returns_none_on_db_exception(self):
        """save_scan returns None (does not propagate) when the database raises."""
        session_mock = self._make_session_mock()
        session_mock.commit.side_effect = Exception("connection refused")
        session_factory = MagicMock(return_value=session_mock)

        with patch("api.db._SessionLocal", session_factory):
            from api.db import save_scan

            result = save_scan(url="https://example.com", score=50, results={})

        assert result is None


class TestAnalyzeUrlEndpointPersistence:
    """The /api/analyze-url endpoint should include report_id in the response when DB is available."""

    def test_report_id_included_when_save_scan_succeeds(self):
        """report_id is added to the response when save_scan returns a UUID."""
        fake_report_id = str(uuid.uuid4())
        mock_result = {"url": "https://example.com", "status": "success", "threat_score": 20}

        app.config["TESTING"] = True
        with app.test_client() as client:
            with patch("api.server.analyze_web_security", return_value=mock_result), patch(
                "api.server.save_scan", return_value=fake_report_id
            ):
                resp = client.post(
                    "/api/analyze-url",
                    data=json.dumps({"url": "https://example.com"}),
                    content_type="application/json",
                )

        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["report_id"] == fake_report_id
        assert data["report_url"] == f"/dashboard/report/{fake_report_id}"

    def test_report_id_absent_when_save_scan_returns_none(self):
        """report_id is NOT added to the response when save_scan returns None."""
        mock_result = {"url": "https://example.com", "status": "success", "threat_score": 0}

        app.config["TESTING"] = True
        with app.test_client() as client:
            with patch("api.server.analyze_web_security", return_value=mock_result), patch(
                "api.server.save_scan", return_value=None
            ):
                resp = client.post(
                    "/api/analyze-url",
                    data=json.dumps({"url": "https://example.com"}),
                    content_type="application/json",
                )

        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert "report_id" not in data
        assert "report_url" not in data
