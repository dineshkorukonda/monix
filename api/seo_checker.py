"""
SEO analysis checker module for Monix web interface.

This module provides SEO checks for a given URL, including:
- Meta title presence and ideal length
- Meta description presence and ideal length
- Open Graph tags (og:title, og:description, og:image)
- robots.txt presence
- sitemap.xml presence
- Canonical tag presence
- H1 tag presence and count

Each check returns a dict with:
    { "status": "pass" | "warn" | "fail", "detail": str }

The module also returns an overall SEO score (int 0-100).
"""

import requests
from urllib.parse import urlparse
from typing import Dict, List, Tuple

try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

# Ideal length ranges for meta tags
TITLE_MIN = 50
TITLE_MAX = 60
DESC_MIN = 150
DESC_MAX = 160

# Weights for each check (must sum to 100)
_CHECK_WEIGHTS = {
    "meta_title": 20,
    "meta_description": 15,
    "og_tags": 15,
    "robots_txt": 10,
    "sitemap_xml": 10,
    "canonical_tag": 15,
    "h1_tag": 15,
}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def _fetch_html(url: str, timeout: int = 10) -> Tuple[str, None] | Tuple[None, str]:
    """
    Fetch HTML content from a URL.

    Returns:
        (html_text, None) on success, (None, error_message) on failure.
    """
    try:
        response = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=timeout,
            allow_redirects=True,
        )
        return response.text, None
    except requests.RequestException as exc:
        return None, str(exc)


def _url_exists(url: str, timeout: int = 5) -> bool:
    """Return True if a GET request to *url* returns HTTP 200."""
    try:
        response = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=timeout,
            allow_redirects=True,
        )
        return response.status_code == 200
    except requests.RequestException:
        return False


def check_meta_title(soup: "BeautifulSoup") -> Dict:
    """
    Check for presence and ideal length of the <title> tag.

    Returns:
        { "status": "pass"|"warn"|"fail", "detail": str }
    """
    tag = soup.find("title")
    if not tag or not tag.get_text(strip=True):
        return {"status": "fail", "detail": "Meta title is missing."}

    title_text = tag.get_text(strip=True)
    length = len(title_text)
    if TITLE_MIN <= length <= TITLE_MAX:
        return {
            "status": "pass",
            "detail": f"Meta title is present and {length} characters (ideal 50-60).",
        }
    if length < TITLE_MIN:
        return {
            "status": "warn",
            "detail": (
                f"Meta title is present but too short ({length} chars); "
                f"ideal length is {TITLE_MIN}-{TITLE_MAX} characters."
            ),
        }
    return {
        "status": "warn",
        "detail": (
            f"Meta title is present but too long ({length} chars); "
            f"ideal length is {TITLE_MIN}-{TITLE_MAX} characters."
        ),
    }


def check_meta_description(soup: "BeautifulSoup") -> Dict:
    """
    Check for presence and ideal length of the meta description.

    Returns:
        { "status": "pass"|"warn"|"fail", "detail": str }
    """
    tag = soup.find("meta", attrs={"name": "description"})
    if not tag or not tag.get("content", "").strip():
        return {"status": "fail", "detail": "Meta description is missing."}

    content = tag["content"].strip()
    length = len(content)
    if DESC_MIN <= length <= DESC_MAX:
        return {
            "status": "pass",
            "detail": f"Meta description is present and {length} characters (ideal 150-160).",
        }
    if length < DESC_MIN:
        return {
            "status": "warn",
            "detail": (
                f"Meta description is present but too short ({length} chars); "
                f"ideal length is {DESC_MIN}-{DESC_MAX} characters."
            ),
        }
    return {
        "status": "warn",
        "detail": (
            f"Meta description is present but too long ({length} chars); "
            f"ideal length is {DESC_MIN}-{DESC_MAX} characters."
        ),
    }


def check_og_tags(soup: "BeautifulSoup") -> Dict:
    """
    Check for the presence of essential Open Graph tags.

    Checks og:title, og:description, and og:image.

    Returns:
        { "status": "pass"|"warn"|"fail", "detail": str }
    """
    required_og = ["og:title", "og:description", "og:image"]
    missing: List[str] = []

    for prop in required_og:
        tag = soup.find("meta", property=prop)
        if not tag or not tag.get("content", "").strip():
            missing.append(prop)

    if not missing:
        return {
            "status": "pass",
            "detail": "All essential Open Graph tags (og:title, og:description, og:image) are present.",
        }
    if len(missing) < len(required_og):
        return {
            "status": "warn",
            "detail": f"Some Open Graph tags are missing: {', '.join(missing)}.",
        }
    return {
        "status": "fail",
        "detail": "All essential Open Graph tags (og:title, og:description, og:image) are missing.",
    }


def check_robots_txt(base_url: str) -> Dict:
    """
    Check for the presence of a robots.txt file.

    Args:
        base_url: Scheme + host, e.g. "https://example.com"

    Returns:
        { "status": "pass"|"fail", "detail": str }
    """
    robots_url = f"{base_url.rstrip('/')}/robots.txt"
    if _url_exists(robots_url):
        return {
            "status": "pass",
            "detail": f"robots.txt is present at {robots_url}.",
        }
    return {
        "status": "fail",
        "detail": f"robots.txt is missing (checked {robots_url}).",
    }


def check_sitemap_xml(base_url: str) -> Dict:
    """
    Check for the presence of a sitemap.xml file.

    Args:
        base_url: Scheme + host, e.g. "https://example.com"

    Returns:
        { "status": "pass"|"fail", "detail": str }
    """
    sitemap_url = f"{base_url.rstrip('/')}/sitemap.xml"
    if _url_exists(sitemap_url):
        return {
            "status": "pass",
            "detail": f"sitemap.xml is present at {sitemap_url}.",
        }
    return {
        "status": "fail",
        "detail": f"sitemap.xml is missing (checked {sitemap_url}).",
    }


def check_canonical_tag(soup: "BeautifulSoup") -> Dict:
    """
    Check for the presence of a canonical <link> tag.

    Returns:
        { "status": "pass"|"fail", "detail": str }
    """
    tag = soup.find("link", rel=lambda r: r and "canonical" in r)
    if tag and tag.get("href", "").strip():
        return {
            "status": "pass",
            "detail": f"Canonical tag is present: {tag['href'].strip()}.",
        }
    return {
        "status": "fail",
        "detail": "Canonical tag is missing.",
    }


def check_h1_tag(soup: "BeautifulSoup") -> Dict:
    """
    Check for the presence and count of H1 tags.

    Best practice: exactly one H1 per page.

    Returns:
        { "status": "pass"|"warn"|"fail", "detail": str }
    """
    h1_tags = soup.find_all("h1")
    count = len(h1_tags)

    if count == 1:
        return {
            "status": "pass",
            "detail": "Exactly one H1 tag is present (best practice).",
        }
    if count == 0:
        return {
            "status": "fail",
            "detail": "No H1 tag found on the page.",
        }
    return {
        "status": "warn",
        "detail": f"Multiple H1 tags found ({count}); best practice is exactly one H1 per page.",
    }


def _status_score(status: str) -> float:
    """Convert a check status string to a numeric fraction (0.0 – 1.0)."""
    return {"pass": 1.0, "warn": 0.5, "fail": 0.0}.get(status, 0.0)


def calculate_seo_score(checks: Dict[str, Dict]) -> int:
    """
    Calculate overall SEO score (0-100) from individual check results.

    Args:
        checks: Mapping of check name → check result dict.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """
    total_weight = sum(_CHECK_WEIGHTS.values())
    weighted_score = sum(
        _CHECK_WEIGHTS.get(name, 0) * _status_score(result.get("status", "fail"))
        for name, result in checks.items()
    )
    return int(round((weighted_score / total_weight) * 100))


def run_seo_checks(url: str) -> Dict:
    """
    Run all SEO checks against *url* and return structured results.

    Args:
        url: Full URL to analyze (e.g. "https://example.com").

    Returns:
        Dictionary with:
            - "checks": dict of per-check results
            - "seo_score": overall score 0-100
            - "error": optional error message if the page could not be fetched
    """
    if not BS4_AVAILABLE:
        return {
            "checks": {},
            "seo_score": 0,
            "error": "beautifulsoup4 is not installed; SEO checks are unavailable.",
        }

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return {
            "checks": {},
            "seo_score": 0,
            "error": f"Invalid URL scheme '{parsed.scheme}'; only http and https are supported.",
        }

    base_url = f"{parsed.scheme}://{parsed.netloc}"

    html, fetch_error = _fetch_html(url)
    if fetch_error or html is None:
        return {
            "checks": {},
            "seo_score": 0,
            "error": f"Failed to fetch URL: {fetch_error}",
        }

    soup = BeautifulSoup(html, "html.parser")

    checks = {
        "meta_title": check_meta_title(soup),
        "meta_description": check_meta_description(soup),
        "og_tags": check_og_tags(soup),
        "robots_txt": check_robots_txt(base_url),
        "sitemap_xml": check_sitemap_xml(base_url),
        "canonical_tag": check_canonical_tag(soup),
        "h1_tag": check_h1_tag(soup),
    }

    seo_score = calculate_seo_score(checks)

    return {
        "checks": checks,
        "seo_score": seo_score,
    }
