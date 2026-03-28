"""
Performance checker module for Monix web interface.

This module calls the Google PageSpeed Insights API to retrieve Lighthouse
scores and Core Web Vitals for both mobile and desktop strategies.

The ``PAGESPEED_API_KEY`` environment variable is used when present; requests
still succeed (at a lower rate-limit) without a key.

Each strategy result contains:
    {
        "performance_score":   int | None,   # 0-100
        "accessibility_score": int | None,   # 0-100
        "best_practices_score": int | None,  # 0-100
        "lcp": str | None,                   # Largest Contentful Paint display value
        "fid": str | None,                   # First Input Delay (max-potential) display value
        "cls": str | None,                   # Cumulative Layout Shift display value
        "error": str | None,                 # Human-readable error if the call failed
    }
"""

import os
import requests
from typing import Dict, Optional

PAGESPEED_API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"


def _fetch_pagespeed(url: str, strategy: str, api_key: Optional[str] = None) -> Dict:
    """
    Call the PageSpeed Insights API for *url* with *strategy*.

    Args:
        url:      Full URL to analyze (e.g. ``"https://example.com"``).
        strategy: Either ``"mobile"`` or ``"desktop"``.
        api_key:  Optional API key; omitted from the request when ``None``.

    Returns:
        Parsed JSON response dict on success, or
        ``{"error": "<message>"}`` on failure.
    """
    params: Dict[str, str] = {"url": url, "strategy": strategy}
    if api_key:
        params["key"] = api_key

    try:
        response = requests.get(PAGESPEED_API_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.HTTPError as exc:
        # Try to extract the API error message from the response body
        try:
            body = exc.response.json()
            api_error = body.get("error", {})
            message = api_error.get("message", str(exc))
        except Exception:
            message = str(exc)
        return {"error": message}
    except requests.RequestException as exc:
        return {"error": str(exc)}


def _extract_scores(data: Dict) -> Dict:
    """
    Extract Lighthouse scores and Core Web Vitals from a PageSpeed API response.

    Args:
        data: Parsed JSON response from the PageSpeed Insights API.

    Returns:
        Dict with performance metrics and an optional ``"error"`` key.
    """
    result: Dict = {
        "performance_score": None,
        "accessibility_score": None,
        "best_practices_score": None,
        "lcp": None,
        "fid": None,
        "cls": None,
        "error": None,
    }

    # Surface API-level error objects (e.g. invalid URL, quota exceeded)
    api_error = data.get("error")
    if api_error:
        if isinstance(api_error, dict):
            result["error"] = api_error.get("message", str(api_error))
        else:
            result["error"] = str(api_error)
        return result

    lighthouse = data.get("lighthouseResult", {})
    categories = lighthouse.get("categories", {})
    audits = lighthouse.get("audits", {})

    # Category scores are returned on a 0–1 scale; convert to 0–100 integers.
    perf = categories.get("performance", {}).get("score")
    if perf is not None:
        result["performance_score"] = int(round(perf * 100))

    a11y = categories.get("accessibility", {}).get("score")
    if a11y is not None:
        result["accessibility_score"] = int(round(a11y * 100))

    bp = categories.get("best-practices", {}).get("score")
    if bp is not None:
        result["best_practices_score"] = int(round(bp * 100))

    # Core Web Vitals — use displayValue strings so callers get human-readable units.
    lcp_audit = audits.get("largest-contentful-paint", {})
    if lcp_audit:
        result["lcp"] = lcp_audit.get("displayValue")

    fid_audit = audits.get("max-potential-fid", {})
    if fid_audit:
        result["fid"] = fid_audit.get("displayValue")

    cls_audit = audits.get("cumulative-layout-shift", {})
    if cls_audit:
        result["cls"] = cls_audit.get("displayValue")

    return result


def run_performance_checks(url: str) -> Dict:
    """
    Run PageSpeed Insights checks for both mobile and desktop strategies.

    The ``PAGESPEED_API_KEY`` environment variable is read at call-time so
    that tests can override it without reloading the module.

    Args:
        url: Full URL to analyze (e.g. ``"https://example.com"``).

    Returns:
        Dictionary with keys:
            - ``"mobile"``:  per-strategy result dict (see module docstring)
            - ``"desktop"``: per-strategy result dict (see module docstring)
    """
    api_key: Optional[str] = os.environ.get("PAGESPEED_API_KEY")

    results: Dict = {}
    for strategy in ("mobile", "desktop"):
        raw = _fetch_pagespeed(url, strategy, api_key)
        if "error" in raw:
            # Network / HTTP error — surface the message, keep all scores null
            results[strategy] = {
                "performance_score": None,
                "accessibility_score": None,
                "best_practices_score": None,
                "lcp": None,
                "fid": None,
                "cls": None,
                "error": raw["error"],
            }
        else:
            results[strategy] = _extract_scores(raw)

    return results
