"""
Overall score calculation for Monix scan results.

Combines security, SEO, and performance category scores into a single
composite score (0-100) using weighted averaging:

    security    50 %
    SEO         30 %
    performance 20 %

Within each category, individual checks contribute using the same
pass/warn/fail mapping used by the SEO checker:

    pass  → 1.0  (full points)
    warn  → 0.5  (half points)
    fail  → 0.0  (zero points)

Public API
----------
calculate_overall_score(security_result, seo_result, performance_result)
    Returns ``{"overall": int, "security": int, "seo": int, "performance": int}``.
"""

from typing import Dict

# ---------------------------------------------------------------------------
# Category weights (must sum to 1.0)
# ---------------------------------------------------------------------------

_WEIGHTS: Dict[str, float] = {
    "security": 0.50,
    "seo": 0.30,
    "performance": 0.20,
}

# Security sub-check weights (must sum to 100)
_SECURITY_WEIGHTS: Dict[str, int] = {
    "ssl": 50,
    "security_headers": 40,
    "security_txt": 10,
}


def _status_score(status: str) -> float:
    """Convert a pass/warn/fail status string to a numeric fraction (0.0–1.0)."""
    return {"pass": 1.0, "warn": 0.5, "fail": 0.0}.get(status, 0.0)


# ---------------------------------------------------------------------------
# Per-category score helpers
# ---------------------------------------------------------------------------


def calculate_security_score(security_result: Dict) -> int:
    """
    Derive a 0-100 security score from an ``analyze_web_security`` result.

    Checks and weights:
        - SSL certificate valid             weight 50  (pass/fail)
        - Security headers coverage         weight 40  (pass ≥ 70 %, warn ≥ 30 %, else fail)
        - security.txt present              weight 10  (pass/fail)

    Args:
        security_result: Dict returned by ``api.scanners.web.analyze_web_security``.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """
    checks: Dict[str, str] = {}

    # --- SSL certificate ---
    ssl = security_result.get("ssl_certificate", {})
    checks["ssl"] = "pass" if ssl.get("valid") else "fail"

    # --- Security headers ---
    header_analysis = security_result.get("security_headers_analysis", {})
    header_pct = header_analysis.get("percentage", 0)
    if header_pct >= 70:
        checks["security_headers"] = "pass"
    elif header_pct >= 30:
        checks["security_headers"] = "warn"
    else:
        checks["security_headers"] = "fail"

    # --- security.txt ---
    security_txt = security_result.get("security_txt", {})
    checks["security_txt"] = "pass" if security_txt.get("present") else "fail"

    total_weight = sum(_SECURITY_WEIGHTS.values())
    weighted_score = sum(
        _SECURITY_WEIGHTS.get(name, 0) * _status_score(status) for name, status in checks.items()
    )
    return int(round((weighted_score / total_weight) * 100))


def calculate_seo_score(seo_result: Dict) -> int:
    """
    Extract the pre-computed SEO score from a ``run_seo_checks`` result.

    The SEO checker already returns a 0-100 score; this function simply
    surfaces it so callers always receive an integer even when the key is
    absent or the value is ``None``.

    Args:
        seo_result: Dict returned by ``api.seo_checker.run_seo_checks``.

    Returns:
        Integer score between 0 and 100 (inclusive).
    """
    score = seo_result.get("seo_score", 0)
    return int(score) if score is not None else 0


def calculate_performance_score(performance_result: Dict) -> int:
    """
    Derive a 0-100 performance score from a ``run_performance_checks`` result.

    Averages the Lighthouse ``performance_score`` values for mobile and
    desktop strategies, ignoring any ``None`` values (e.g. when the API
    key is missing or a quota is exceeded).

    Args:
        performance_result: Dict returned by ``api.performance_checker.run_performance_checks``.

    Returns:
        Integer score between 0 and 100 (inclusive), or 0 if no scores are
        available.
    """
    scores = [
        performance_result.get(strategy, {}).get("performance_score")
        for strategy in ("mobile", "desktop")
    ]
    valid_scores = [s for s in scores if s is not None]
    if not valid_scores:
        return 0
    return int(round(sum(valid_scores) / len(valid_scores)))


# ---------------------------------------------------------------------------
# Public composite scorer
# ---------------------------------------------------------------------------


def calculate_overall_score(
    security_result: Dict,
    seo_result: Dict,
    performance_result: Dict,
) -> Dict[str, int]:
    """
    Calculate a single overall score (0-100) for a scan.

    Weights applied:
        security    50 %
        SEO         30 %
        performance 20 %

    Args:
        security_result:    Dict from ``api.scanners.web.analyze_web_security``.
        seo_result:         Dict from ``api.seo_checker.run_seo_checks``.
        performance_result: Dict from ``api.performance_checker.run_performance_checks``.

    Returns:
        ``{"overall": int, "security": int, "seo": int, "performance": int}``
        All values are integers in [0, 100].
    """
    security = calculate_security_score(security_result)
    seo = calculate_seo_score(seo_result)
    performance = calculate_performance_score(performance_result)

    overall = int(
        round(
            security * _WEIGHTS["security"]
            + seo * _WEIGHTS["seo"]
            + performance * _WEIGHTS["performance"]
        )
    )

    return {
        "overall": overall,
        "security": security,
        "seo": seo,
        "performance": performance,
    }
