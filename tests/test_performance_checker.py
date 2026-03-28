"""Tests for api.performance_checker module."""

from unittest.mock import patch, MagicMock

from api.performance_checker import (
    _fetch_pagespeed,
    _extract_scores,
    run_performance_checks,
)

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# _fetch_pagespeed
# ---------------------------------------------------------------------------
class TestFetchPagespeed:
    @patch("api.performance_checker.requests.get")
    def test_successful_fetch_returns_json(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _LIGHTHOUSE_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        result = _fetch_pagespeed("https://example.com", "mobile", api_key="key123")

        mock_get.assert_called_once()
        call_kwargs = mock_get.call_args
        assert call_kwargs[1]["params"]["strategy"] == "mobile"
        assert call_kwargs[1]["params"]["key"] == "key123"
        assert result == _LIGHTHOUSE_RESPONSE

    @patch("api.performance_checker.requests.get")
    def test_no_api_key_omitted_from_params(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _LIGHTHOUSE_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        _fetch_pagespeed("https://example.com", "desktop", api_key=None)

        params = mock_get.call_args[1]["params"]
        assert "key" not in params

    @patch("api.performance_checker.requests.get")
    def test_http_error_returns_error_dict(self, mock_get):
        import requests as _requests

        error_body = MagicMock()
        error_body.json.return_value = {"error": {"code": 400, "message": "Bad request"}}
        http_err = _requests.HTTPError(response=error_body)
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = http_err
        mock_get.return_value = mock_resp

        result = _fetch_pagespeed("https://example.com", "mobile")

        assert "error" in result
        assert "Bad request" in result["error"]

    @patch("api.performance_checker.requests.get")
    def test_connection_error_returns_error_dict(self, mock_get):
        import requests as _requests

        mock_get.side_effect = _requests.ConnectionError("Connection refused")

        result = _fetch_pagespeed("https://example.com", "mobile")

        assert "error" in result
        assert result["error"]


# ---------------------------------------------------------------------------
# _extract_scores
# ---------------------------------------------------------------------------
class TestExtractScores:
    def test_full_response_extracts_all_fields(self):
        result = _extract_scores(_LIGHTHOUSE_RESPONSE)

        assert result["performance_score"] == 92
        assert result["accessibility_score"] == 85
        assert result["best_practices_score"] == 100
        assert result["lcp"] == "1.2 s"
        assert result["fid"] == "50 ms"
        assert result["cls"] == "0.05"
        assert result["error"] is None

    def test_missing_categories_returns_none_scores(self):
        data = {"lighthouseResult": {"categories": {}, "audits": {}}}
        result = _extract_scores(data)

        assert result["performance_score"] is None
        assert result["accessibility_score"] is None
        assert result["best_practices_score"] is None

    def test_api_error_dict_surfaces_message(self):
        data = {"error": {"code": 429, "message": "Quota exceeded"}}
        result = _extract_scores(data)

        assert result["error"] == "Quota exceeded"
        assert result["performance_score"] is None

    def test_api_error_string_surfaces_message(self):
        data = {"error": "Some string error"}
        result = _extract_scores(data)

        assert result["error"] == "Some string error"
        assert result["performance_score"] is None

    def test_score_rounding(self):
        data = {
            "lighthouseResult": {
                "categories": {"performance": {"score": 0.955}},
                "audits": {},
            }
        }
        result = _extract_scores(data)
        assert result["performance_score"] == 96  # round(95.5) == 96

    def test_missing_audits_returns_none_vitals(self):
        data = {
            "lighthouseResult": {
                "categories": {"performance": {"score": 0.8}},
                "audits": {},
            }
        }
        result = _extract_scores(data)
        assert result["lcp"] is None
        assert result["fid"] is None
        assert result["cls"] is None


# ---------------------------------------------------------------------------
# run_performance_checks
# ---------------------------------------------------------------------------
class TestRunPerformanceChecks:
    @patch("api.performance_checker._fetch_pagespeed")
    def test_returns_mobile_and_desktop_keys(self, mock_fetch):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE

        result = run_performance_checks("https://example.com")

        assert "mobile" in result
        assert "desktop" in result
        assert mock_fetch.call_count == 2

    @patch("api.performance_checker._fetch_pagespeed")
    def test_successful_scores_populated(self, mock_fetch):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE

        result = run_performance_checks("https://example.com")

        for strategy in ("mobile", "desktop"):
            assert result[strategy]["performance_score"] == 92
            assert result[strategy]["accessibility_score"] == 85
            assert result[strategy]["best_practices_score"] == 100
            assert result[strategy]["lcp"] == "1.2 s"
            assert result[strategy]["fid"] == "50 ms"
            assert result[strategy]["cls"] == "0.05"
            assert result[strategy]["error"] is None

    @patch("api.performance_checker._fetch_pagespeed")
    def test_api_error_returns_null_scores_without_raising(self, mock_fetch):
        mock_fetch.return_value = {"error": "Service unavailable"}

        result = run_performance_checks("https://example.com")

        for strategy in ("mobile", "desktop"):
            assert result[strategy]["performance_score"] is None
            assert result[strategy]["accessibility_score"] is None
            assert result[strategy]["best_practices_score"] is None
            assert result[strategy]["lcp"] is None
            assert result[strategy]["fid"] is None
            assert result[strategy]["cls"] is None
            assert result[strategy]["error"] == "Service unavailable"

    @patch("api.performance_checker.os.environ.get", return_value="my-api-key")
    @patch("api.performance_checker._fetch_pagespeed")
    def test_api_key_passed_from_environment(self, mock_fetch, mock_env):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE

        run_performance_checks("https://example.com")

        for call in mock_fetch.call_args_list:
            assert call[0][2] == "my-api-key"

    @patch("api.performance_checker.os.environ.get", return_value=None)
    @patch("api.performance_checker._fetch_pagespeed")
    def test_no_api_key_passes_none(self, mock_fetch, mock_env):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE

        run_performance_checks("https://example.com")

        for call in mock_fetch.call_args_list:
            assert call[0][2] is None

    @patch("api.performance_checker._fetch_pagespeed")
    def test_strategies_called_are_mobile_and_desktop(self, mock_fetch):
        mock_fetch.return_value = _LIGHTHOUSE_RESPONSE

        run_performance_checks("https://example.com")

        strategies = {call[0][1] for call in mock_fetch.call_args_list}
        assert strategies == {"mobile", "desktop"}
