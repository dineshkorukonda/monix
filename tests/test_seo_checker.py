"""Tests for api.seo_checker module."""

import pytest
from unittest.mock import patch, MagicMock
from bs4 import BeautifulSoup

from api.seo_checker import (
    check_meta_title,
    check_meta_description,
    check_og_tags,
    check_robots_txt,
    check_sitemap_xml,
    check_canonical_tag,
    check_h1_tag,
    calculate_seo_score,
    run_seo_checks,
)


def _soup(html: str) -> BeautifulSoup:
    """Helper: parse HTML snippet into a BeautifulSoup object."""
    return BeautifulSoup(html, "html.parser")


# ---------------------------------------------------------------------------
# check_meta_title
# ---------------------------------------------------------------------------
class TestCheckMetaTitle:
    def test_missing_title_fails(self):
        result = check_meta_title(_soup("<html></html>"))
        assert result["status"] == "fail"
        assert "missing" in result["detail"].lower()

    def test_empty_title_fails(self):
        result = check_meta_title(_soup("<title>   </title>"))
        assert result["status"] == "fail"

    def test_ideal_length_passes(self):
        title = "A" * 55  # 55 chars – within 50-60
        result = check_meta_title(_soup(f"<title>{title}</title>"))
        assert result["status"] == "pass"
        assert "55" in result["detail"]

    def test_too_short_warns(self):
        title = "Short"  # 5 chars
        result = check_meta_title(_soup(f"<title>{title}</title>"))
        assert result["status"] == "warn"
        assert "short" in result["detail"].lower()

    def test_too_long_warns(self):
        title = "A" * 80  # 80 chars – over 60
        result = check_meta_title(_soup(f"<title>{title}</title>"))
        assert result["status"] == "warn"
        assert "long" in result["detail"].lower()


# ---------------------------------------------------------------------------
# check_meta_description
# ---------------------------------------------------------------------------
class TestCheckMetaDescription:
    def test_missing_description_fails(self):
        result = check_meta_description(_soup("<html></html>"))
        assert result["status"] == "fail"
        assert "missing" in result["detail"].lower()

    def test_empty_content_fails(self):
        result = check_meta_description(
            _soup('<meta name="description" content="   ">')
        )
        assert result["status"] == "fail"

    def test_ideal_length_passes(self):
        content = "B" * 155  # within 150-160
        result = check_meta_description(
            _soup(f'<meta name="description" content="{content}">')
        )
        assert result["status"] == "pass"

    def test_too_short_warns(self):
        result = check_meta_description(
            _soup('<meta name="description" content="Too short">')
        )
        assert result["status"] == "warn"
        assert "short" in result["detail"].lower()

    def test_too_long_warns(self):
        content = "C" * 200
        result = check_meta_description(
            _soup(f'<meta name="description" content="{content}">')
        )
        assert result["status"] == "warn"
        assert "long" in result["detail"].lower()


# ---------------------------------------------------------------------------
# check_og_tags
# ---------------------------------------------------------------------------
class TestCheckOgTags:
    _FULL_OG = (
        '<meta property="og:title" content="Title">'
        '<meta property="og:description" content="Description">'
        '<meta property="og:image" content="https://example.com/img.jpg">'
    )

    def test_all_present_passes(self):
        result = check_og_tags(_soup(self._FULL_OG))
        assert result["status"] == "pass"

    def test_missing_image_warns(self):
        html = (
            '<meta property="og:title" content="Title">'
            '<meta property="og:description" content="Description">'
        )
        result = check_og_tags(_soup(html))
        assert result["status"] == "warn"
        assert "og:image" in result["detail"]

    def test_all_missing_fails(self):
        result = check_og_tags(_soup("<html></html>"))
        assert result["status"] == "fail"


# ---------------------------------------------------------------------------
# check_robots_txt
# ---------------------------------------------------------------------------
class TestCheckRobotsTxt:
    @patch("api.seo_checker._url_exists", return_value=True)
    def test_present_passes(self, _mock):
        result = check_robots_txt("https://example.com")
        assert result["status"] == "pass"
        assert "robots.txt" in result["detail"]

    @patch("api.seo_checker._url_exists", return_value=False)
    def test_absent_fails(self, _mock):
        result = check_robots_txt("https://example.com")
        assert result["status"] == "fail"
        assert "missing" in result["detail"].lower()


# ---------------------------------------------------------------------------
# check_sitemap_xml
# ---------------------------------------------------------------------------
class TestCheckSitemapXml:
    @patch("api.seo_checker._url_exists", return_value=True)
    def test_present_passes(self, _mock):
        result = check_sitemap_xml("https://example.com")
        assert result["status"] == "pass"
        assert "sitemap.xml" in result["detail"]

    @patch("api.seo_checker._url_exists", return_value=False)
    def test_absent_fails(self, _mock):
        result = check_sitemap_xml("https://example.com")
        assert result["status"] == "fail"
        assert "missing" in result["detail"].lower()


# ---------------------------------------------------------------------------
# check_canonical_tag
# ---------------------------------------------------------------------------
class TestCheckCanonicalTag:
    def test_present_passes(self):
        html = '<link rel="canonical" href="https://example.com/">'
        result = check_canonical_tag(_soup(html))
        assert result["status"] == "pass"
        assert "https://example.com/" in result["detail"]

    def test_missing_fails(self):
        result = check_canonical_tag(_soup("<html></html>"))
        assert result["status"] == "fail"
        assert "missing" in result["detail"].lower()

    def test_empty_href_fails(self):
        html = '<link rel="canonical" href="  ">'
        result = check_canonical_tag(_soup(html))
        assert result["status"] == "fail"


# ---------------------------------------------------------------------------
# check_h1_tag
# ---------------------------------------------------------------------------
class TestCheckH1Tag:
    def test_one_h1_passes(self):
        result = check_h1_tag(_soup("<h1>Main heading</h1>"))
        assert result["status"] == "pass"

    def test_no_h1_fails(self):
        result = check_h1_tag(_soup("<html></html>"))
        assert result["status"] == "fail"
        assert "no h1" in result["detail"].lower()

    def test_multiple_h1_warns(self):
        result = check_h1_tag(_soup("<h1>First</h1><h1>Second</h1>"))
        assert result["status"] == "warn"
        assert "2" in result["detail"]


# ---------------------------------------------------------------------------
# calculate_seo_score
# ---------------------------------------------------------------------------
class TestCalculateSeoScore:
    def test_all_pass_gives_100(self):
        checks = {name: {"status": "pass"} for name in
                  ["meta_title", "meta_description", "og_tags",
                   "robots_txt", "sitemap_xml", "canonical_tag", "h1_tag"]}
        assert calculate_seo_score(checks) == 100

    def test_all_fail_gives_0(self):
        checks = {name: {"status": "fail"} for name in
                  ["meta_title", "meta_description", "og_tags",
                   "robots_txt", "sitemap_xml", "canonical_tag", "h1_tag"]}
        assert calculate_seo_score(checks) == 0

    def test_all_warn_gives_50(self):
        checks = {name: {"status": "warn"} for name in
                  ["meta_title", "meta_description", "og_tags",
                   "robots_txt", "sitemap_xml", "canonical_tag", "h1_tag"]}
        assert calculate_seo_score(checks) == 50

    def test_partial_score(self):
        # Only meta_title (weight 20) passes; rest fail → 20/100 = 20
        checks = {
            "meta_title": {"status": "pass"},
            "meta_description": {"status": "fail"},
            "og_tags": {"status": "fail"},
            "robots_txt": {"status": "fail"},
            "sitemap_xml": {"status": "fail"},
            "canonical_tag": {"status": "fail"},
            "h1_tag": {"status": "fail"},
        }
        assert calculate_seo_score(checks) == 20


# ---------------------------------------------------------------------------
# run_seo_checks (integration-level with mocked network)
# ---------------------------------------------------------------------------
class TestRunSeoChecks:
    @patch("api.seo_checker._url_exists", return_value=True)
    @patch("api.seo_checker._fetch_html")
    def test_returns_checks_and_score(self, mock_fetch, _mock_exists):
        title = "A" * 55
        desc = "B" * 155
        html = f"""<!DOCTYPE html>
<html>
<head>
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta property="og:title" content="OG Title">
  <meta property="og:description" content="OG Description">
  <meta property="og:image" content="https://example.com/img.jpg">
  <link rel="canonical" href="https://example.com/">
</head>
<body><h1>Main heading</h1></body>
</html>"""
        mock_fetch.return_value = (html, None)

        result = run_seo_checks("https://example.com")

        assert "checks" in result
        assert "seo_score" in result
        assert isinstance(result["seo_score"], int)
        assert 0 <= result["seo_score"] <= 100
        # All checks should be present
        for key in ["meta_title", "meta_description", "og_tags",
                    "robots_txt", "sitemap_xml", "canonical_tag", "h1_tag"]:
            assert key in result["checks"]
        # All checks should have status and detail
        for check in result["checks"].values():
            assert "status" in check
            assert check["status"] in ("pass", "warn", "fail")
            assert "detail" in check

    @patch("api.seo_checker._fetch_html")
    def test_fetch_failure_returns_error(self, mock_fetch):
        mock_fetch.return_value = (None, "Connection refused")
        result = run_seo_checks("https://example.com")
        assert "error" in result
        assert result["seo_score"] == 0
        assert result["checks"] == {}

    def test_invalid_scheme_returns_error(self):
        result = run_seo_checks("ftp://example.com")
        assert "error" in result
        assert result["seo_score"] == 0
        assert result["checks"] == {}

    @patch("api.seo_checker.BS4_AVAILABLE", False)
    def test_missing_bs4_returns_error(self):
        result = run_seo_checks("https://example.com")
        assert "error" in result
        assert result["seo_score"] == 0
