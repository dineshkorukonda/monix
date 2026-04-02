"""Tests for scan_engine.seo_checker (focused on scoring and run_seo_checks)."""

from unittest.mock import patch

import pytest
from bs4 import BeautifulSoup

from scan_engine.seo_checker import (
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
    return BeautifulSoup(html, "html.parser")


@pytest.mark.parametrize(
    "html,expected",
    [
        ("<html></html>", "fail"),
        ("<title>   </title>", "fail"),
        ("<title>Short</title>", "warn"),
        ("<title>{}</title>".format("A" * 80), "warn"),
    ],
)
def test_meta_title_non_pass_states(html, expected):
    assert check_meta_title(_soup(html))["status"] == expected


def test_meta_title_ideal_passes():
    title = "A" * 55
    r = check_meta_title(_soup(f"<title>{title}</title>"))
    assert r["status"] == "pass"
    assert "55" in r["detail"]


@pytest.mark.parametrize(
    "html,expected",
    [
        ("<html></html>", "fail"),
        ('<meta name="description" content="   ">', "fail"),
        ('<meta name="description" content="Too short">', "warn"),
    ],
)
def test_meta_description_non_pass_states(html, expected):
    assert check_meta_description(_soup(html))["status"] == expected


def test_meta_description_ideal_passes():
    content = "B" * 155
    r = check_meta_description(_soup(f'<meta name="description" content="{content}">'))
    assert r["status"] == "pass"


def test_og_tags_pass_and_fail():
    full = (
        '<meta property="og:title" content="Title">'
        '<meta property="og:description" content="Description">'
        '<meta property="og:image" content="https://example.com/img.jpg">'
    )
    assert check_og_tags(_soup(full))["status"] == "pass"
    assert check_og_tags(_soup("<html></html>"))["status"] == "fail"


class TestRobotsAndSitemap:
    @patch("scan_engine.seo_checker._url_exists", return_value=True)
    def test_robots_and_sitemap_present(self, _mock):
        assert check_robots_txt("https://example.com")["status"] == "pass"
        assert check_sitemap_xml("https://example.com")["status"] == "pass"

    @patch("scan_engine.seo_checker._url_exists", return_value=False)
    def test_robots_and_sitemap_absent(self, _mock):
        assert check_robots_txt("https://example.com")["status"] == "fail"
        assert check_sitemap_xml("https://example.com")["status"] == "fail"


def test_canonical_and_h1():
    assert check_canonical_tag(_soup('<link rel="canonical" href="https://example.com/">'))["status"] == "pass"
    assert check_canonical_tag(_soup("<html></html>"))["status"] == "fail"
    assert check_h1_tag(_soup("<h1>Main</h1>"))["status"] == "pass"
    assert check_h1_tag(_soup("<html></html>"))["status"] == "fail"


class TestCalculateSeoScore:
    def test_all_pass_and_all_fail(self):
        names = [
            "meta_title",
            "meta_description",
            "og_tags",
            "robots_txt",
            "sitemap_xml",
            "canonical_tag",
            "h1_tag",
        ]
        assert calculate_seo_score({n: {"status": "pass"} for n in names}) == 100
        assert calculate_seo_score({n: {"status": "fail"} for n in names}) == 0

    def test_partial_score(self):
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


class TestRunSeoChecks:
    @patch("scan_engine.seo_checker._url_exists", return_value=True)
    @patch("scan_engine.seo_checker._fetch_html")
    def test_happy_path_returns_checks_and_score(self, mock_fetch, _mock_exists):
        title, desc = "A" * 55, "B" * 155
        html = f"""<!DOCTYPE html><html><head>
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="OG Title">
<meta property="og:description" content="OG Description">
<meta property="og:image" content="https://example.com/img.jpg">
<link rel="canonical" href="https://example.com/">
</head><body><h1>Main heading</h1></body></html>"""
        mock_fetch.return_value = (html, None)
        result = run_seo_checks("https://example.com")
        assert "checks" in result and "seo_score" in result
        assert 0 <= result["seo_score"] <= 100
        for key in (
            "meta_title",
            "meta_description",
            "og_tags",
            "robots_txt",
            "sitemap_xml",
            "canonical_tag",
            "h1_tag",
        ):
            assert key in result["checks"]

    @patch("scan_engine.seo_checker._fetch_html")
    def test_fetch_failure_returns_error(self, mock_fetch):
        mock_fetch.return_value = (None, "Connection refused")
        result = run_seo_checks("https://example.com")
        assert "error" in result
        assert result["seo_score"] == 0

    def test_invalid_scheme_returns_error(self):
        result = run_seo_checks("ftp://example.com")
        assert "error" in result
        assert result["seo_score"] == 0
