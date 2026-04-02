"""Tests for scan_engine.performance_checker (PageSpeed fetch, extract, run)."""

from unittest.mock import patch, MagicMock

import pytest
import requests as _requests

from scan_engine.performance_checker import (
    _fetch_pagespeed,
    _extract_scores,
    run_performance_checks,
)

_LIGHTHOUSE_RESPONSE = {
    "lighthouseResult": {
        "categories": {
            "performance": {"score": 0.92},
            "accessibility": {"score": 0.85},
            "best-practices": {"score": 1.0},
        },
        "audits": {
            "largest-contentful-paint": {"displayValue": "1.2 s"},
            "max-potential-fid": {"displayValue": "50 ms"},
            "cumulative-layout-shift": {"displayValue": "0.05"},
        },
    }
}


class TestFetchPagespeed:
    @patch("scan_engine.performance_checker.requests.get")
    def test_success_includes_strategy_and_optional_key(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _LIGHTHOUSE_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        assert _fetch_pagespeed("https://example.com", "mobile", api_key="key") == _LIGHTHOUSE_RESPONSE
        params = mock_get.call_args[1]["params"]
        assert params["strategy"] == "mobile" and params["key"] == "key"

        mock_get.reset_mock()
        _fetch_pagespeed("https://example.com", "desktop", api_key=None)
        assert "key" not in mock_get.call_args[1]["params"]

    @patch("scan_engine.performance_checker.requests.get")
    def test_http_and_connection_errors_return_dict(self, mock_get):
        err_body = MagicMock()
        err_body.json.return_value = {"error": {"message": "Bad request"}}
        http_err = _requests.HTTPError(response=err_body)
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = http_err
        mock_get.return_value = mock_resp
        assert "Bad request" in _fetch_pagespeed("https://example.com", "mobile")["error"]

        mock_get.reset_mock()
        mock_get.side_effect = _requests.ConnectionError("refused")
        assert "refused" in _fetch_pagespeed("https://example.com", "mobile")["error"]


class TestExtractScores:
    def test_happy_path_and_error_shapes(self):
        r = _extract_scores(_LIGHTHOUSE_RESPONSE)
        assert r["performance_score"] == 92 and r["accessibility_score"] == 85
        assert r["error"] is None

        empty = _extract_scores({"lighthouseResult": {"categories": {}, "audits": {}}})
        assert empty["performance_score"] is None

        err = _extract_scores({"error": {"message": "Quota exceeded"}})
        assert err["error"] == "Quota exceeded"

        rnd = _extract_scores(
            {"lighthouseResult": {"categories": {"performance": {"score": 0.955}}, "audits": {}}}
        )
        assert rnd["performance_score"] == 96


class TestRunPerformanceChecks:
    @patch("scan_engine.performance_checker._fetch_pagespeed")
    def test_populates_mobile_desktop_and_handles_service_error(self, mock_fetch):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE
        ok = run_performance_checks("https://example.com")
        assert mock_fetch.call_count == 2
        assert {c[0][1] for c in mock_fetch.call_args_list} == {"mobile", "desktop"}
        for s in ("mobile", "desktop"):
            assert ok[s]["performance_score"] == 92

        mock_fetch.return_value = {"error": "Service unavailable"}
        err = run_performance_checks("https://example.com")
        for s in ("mobile", "desktop"):
            assert err[s]["performance_score"] is None
            assert err[s]["error"] == "Service unavailable"

    @pytest.mark.parametrize("env_key", ["my-api-key", None])
    @patch("scan_engine.performance_checker.os.environ.get")
    @patch("scan_engine.performance_checker._fetch_pagespeed")
    def test_api_key_from_environment(self, mock_fetch, mock_env, env_key):
        mock_env.return_value = env_key
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE
        run_performance_checks("https://example.com")
        for call in mock_fetch.call_args_list:
            assert call[0][2] == env_key
