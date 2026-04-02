"""Tests for api.scoring module."""

from scan_engine.scoring import (
    calculate_security_score,
    calculate_seo_score,
    calculate_performance_score,
    calculate_overall_score,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _security_result(ssl_valid=True, header_pct=100, security_txt=True):
    """Build a minimal security result dict suitable for calculate_security_score."""
    return {
        "ssl_certificate": {"valid": ssl_valid},
        "security_headers_analysis": {"percentage": header_pct},
        "security_txt": {"present": security_txt},
    }


def _seo_result(seo_score=100):
    """Build a minimal SEO result dict suitable for calculate_seo_score."""
    return {"seo_score": seo_score}


def _performance_result(mobile=100, desktop=100):
    """Build a minimal performance result dict suitable for calculate_performance_score."""
    return {
        "mobile": {"performance_score": mobile},
        "desktop": {"performance_score": desktop},
    }


# ---------------------------------------------------------------------------
# calculate_security_score
# ---------------------------------------------------------------------------


class TestCalculateSecurityScore:
    def test_all_pass_gives_100(self):
        result = _security_result(ssl_valid=True, header_pct=100, security_txt=True)
        assert calculate_security_score(result) == 100

    def test_all_fail_gives_0(self):
        result = _security_result(ssl_valid=False, header_pct=0, security_txt=False)
        assert calculate_security_score(result) == 0

    def test_ssl_fail_reduces_score(self):
        # Only SSL fails (weight 50). Headers 100% (weight 40) and security.txt pass (weight 10).
        result = _security_result(ssl_valid=False, header_pct=100, security_txt=True)
        # (0*50 + 1.0*40 + 1.0*10) / 100 * 100 = 50
        assert calculate_security_score(result) == 50

    def test_missing_ssl_key_treated_as_fail(self):
        result = {
            "security_headers_analysis": {"percentage": 100},
            "security_txt": {"present": True},
        }
        # ssl not in result → treated as fail (score 0 for that check)
        # (0*50 + 1.0*40 + 1.0*10) / 100 * 100 = 50
        assert calculate_security_score(result) == 50

    def test_header_pct_30_gives_warn(self):
        result = _security_result(ssl_valid=False, header_pct=30, security_txt=False)
        # ssl fail (0*50), headers warn (0.5*40), security_txt fail (0*10) → 20/100*100 = 20
        assert calculate_security_score(result) == 20

    def test_security_txt_absent_reduces_score(self):
        result = _security_result(ssl_valid=True, header_pct=100, security_txt=False)
        # ssl pass (1.0*50), headers pass (1.0*40), security_txt fail (0*10) → 90
        assert calculate_security_score(result) == 90

    def test_empty_result_gives_0(self):
        assert calculate_security_score({}) == 0


# ---------------------------------------------------------------------------
# calculate_seo_score
# ---------------------------------------------------------------------------


class TestCalculateSeoScore:
    def test_perfect_seo_score(self):
        assert calculate_seo_score(_seo_result(100)) == 100

    def test_zero_seo_score(self):
        assert calculate_seo_score(_seo_result(0)) == 0

    def test_partial_seo_score(self):
        assert calculate_seo_score(_seo_result(75)) == 75

    def test_missing_seo_score_key_returns_0(self):
        assert calculate_seo_score({}) == 0

    def test_none_seo_score_returns_0(self):
        assert calculate_seo_score({"seo_score": None}) == 0


# ---------------------------------------------------------------------------
# calculate_performance_score
# ---------------------------------------------------------------------------


class TestCalculatePerformanceScore:
    def test_both_strategies_averages_correctly(self):
        result = _performance_result(mobile=80, desktop=100)
        assert calculate_performance_score(result) == 90

    def test_mobile_only_returns_mobile_score(self):
        result = {
            "mobile": {"performance_score": 60},
            "desktop": {"performance_score": None},
        }
        assert calculate_performance_score(result) == 60

    def test_desktop_only_returns_desktop_score(self):
        result = {
            "mobile": {"performance_score": None},
            "desktop": {"performance_score": 70},
        }
        assert calculate_performance_score(result) == 70

    def test_no_scores_returns_0(self):
        result = {
            "mobile": {"performance_score": None},
            "desktop": {"performance_score": None},
        }
        assert calculate_performance_score(result) == 0

    def test_empty_result_returns_0(self):
        assert calculate_performance_score({}) == 0

    def test_perfect_scores(self):
        assert calculate_performance_score(_performance_result(100, 100)) == 100

    def test_rounding(self):
        # (60 + 61) / 2 = 60.5 → Python uses round-half-to-even (banker's
        # rounding), so 60.5 rounds to 60 (the nearest even integer).
        result = _performance_result(mobile=60, desktop=61)
        score = calculate_performance_score(result)
        assert score in (60, 61)


# ---------------------------------------------------------------------------
# calculate_overall_score — known-input / expected-output tests
# ---------------------------------------------------------------------------


class TestCalculateOverallScore:
    def test_all_perfect_gives_100(self):
        scores = calculate_overall_score(
            _security_result(True, 100, True),
            _seo_result(100),
            _performance_result(100, 100),
        )
        assert scores == {"overall": 100, "security": 100, "seo": 100, "performance": 100}

    def test_all_zero_gives_0(self):
        scores = calculate_overall_score(
            _security_result(False, 0, False),
            _seo_result(0),
            _performance_result(None, None),
        )
        # all categories → 0; overall = 0
        assert scores == {"overall": 0, "security": 0, "seo": 0, "performance": 0}

    def test_weights_applied_correctly(self):
        # security=100, seo=0, performance=0
        # overall = 100*0.5 + 0*0.3 + 0*0.2 = 50
        scores = calculate_overall_score(
            _security_result(True, 100, True),
            _seo_result(0),
            _performance_result(None, None),
        )
        assert scores["overall"] == 50
        assert scores["security"] == 100
        assert scores["seo"] == 0
        assert scores["performance"] == 0

    def test_mixed_scores(self):
        # security=50, seo=60, performance=80
        # overall = 50*0.5 + 60*0.3 + 80*0.2 = 25 + 18 + 16 = 59
        # security: ssl fail(0*50) + headers warn(0.5*40) + sec_txt pass(1.0*10) = 30% → 30
        # Let's use a simpler known setup: ssl pass, headers 30% (warn), sec_txt fail
        # security = (1.0*50 + 0.5*40 + 0.0*10)/100*100 = 70
        scores = calculate_overall_score(
            _security_result(ssl_valid=True, header_pct=30, security_txt=False),
            _seo_result(60),
            _performance_result(80, 80),
        )
        assert scores["security"] == 70
        assert scores["seo"] == 60
        assert scores["performance"] == 80
        # overall = 70*0.5 + 60*0.3 + 80*0.2 = 35 + 18 + 16 = 69
        assert scores["overall"] == 69

    def test_skip_performance_reweights_overall(self):
        """When PageSpeed is skipped, overall uses security + SEO only (62.5% / 37.5%)."""
        scores = calculate_overall_score(
            _security_result(True, 100, True),
            _seo_result(80),
            _performance_result(100, 100),
            include_performance=False,
        )
        assert scores["security"] == 100
        assert scores["seo"] == 80
        assert scores["performance"] == 0
        assert scores["overall"] == int(round(100 * 0.625 + 80 * 0.375))
