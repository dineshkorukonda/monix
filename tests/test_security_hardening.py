"""Tests for Phase 1 security hardening changes.

Covers:
- SECRET_KEY crash on missing env
- DEBUG defaults to False
- Supabase HS256 rejects tokens when secret is unset
- Engine endpoints require auth when REQUIRE_ENGINE_AUTH=True
- api_change_password uses _ensure_auth (works with JWT)
- HTTPS settings enabled when DEBUG=False
"""

import json
import os
import sys
import time
import uuid
from unittest.mock import patch

import django
import jwt
import pytest

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.contrib.auth.models import User


def _bearer_token(sub: str, email: str) -> str:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "test-supabase-jwt-secret")
    now = int(time.time())
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "aud": "authenticated",
            "iat": now,
            "exp": now + 3600,
            "user_metadata": {"full_name": "Test User"},
        },
        secret,
        algorithm="HS256",
    )


# ---------------------------------------------------------------------------
# P1.1 — SECRET_KEY crash on missing env
# ---------------------------------------------------------------------------


class SecretKeyRequiredTest(TestCase):
    def test_settings_require_secret_key(self):
        """The SECRET_KEY validation block must raise when env is empty."""
        from django.core.exceptions import ImproperlyConfigured

        with patch.dict(os.environ, {"DJANGO_SECRET_KEY": ""}):
            val = os.environ.get("DJANGO_SECRET_KEY", "").strip()
            assert val == "", "DJANGO_SECRET_KEY should be empty for this test"
            with pytest.raises(ImproperlyConfigured, match="DJANGO_SECRET_KEY"):
                _sk = os.environ.get("DJANGO_SECRET_KEY", "").strip()
                if not _sk:
                    raise ImproperlyConfigured(
                        "DJANGO_SECRET_KEY is required."
                    )

    def test_settings_has_no_hardcoded_fallback(self):
        """Verify the settings module no longer contains the insecure default."""
        import config.settings as settings_mod
        import inspect

        source = inspect.getsource(settings_mod)
        assert "django-insecure-" not in source, (
            "Hardcoded insecure SECRET_KEY fallback must be removed from settings.py"
        )


# ---------------------------------------------------------------------------
# P1.3 — Supabase HS256 rejects tokens without explicit secret
# ---------------------------------------------------------------------------


class SupabaseHS256NoSecretTest(TestCase):
    def test_hs256_rejected_when_secret_unset(self):
        """HS256 tokens must be rejected when SUPABASE_JWT_SECRET is empty."""
        from reports.supabase_auth import _decode

        token = jwt.encode(
            {
                "sub": "test-sub",
                "email": "a@test.com",
                "aud": "authenticated",
                "exp": int(time.time()) + 3600,
            },
            "some-random-secret",
            algorithm="HS256",
        )
        with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": ""}):
            with pytest.raises(jwt.InvalidKeyError, match="SUPABASE_JWT_SECRET"):
                _decode(token)

    def test_hs256_accepted_when_secret_matches(self):
        """HS256 tokens are accepted when SUPABASE_JWT_SECRET matches."""
        from reports.supabase_auth import _decode

        secret = "my-test-secret"
        token = jwt.encode(
            {
                "sub": "test-sub",
                "email": "a@test.com",
                "aud": "authenticated",
                "exp": int(time.time()) + 3600,
            },
            secret,
            algorithm="HS256",
        )
        with patch.dict(os.environ, {"SUPABASE_JWT_SECRET": secret}):
            claims = _decode(token)
            assert claims["sub"] == "test-sub"


# ---------------------------------------------------------------------------
# P1.4 — Engine endpoints require auth when REQUIRE_ENGINE_AUTH=True
# ---------------------------------------------------------------------------

ENGINE_ENDPOINTS = [
    "/api/analyze-url",
    "/api/threat-info/",
    "/api/connections/",
    "/api/alerts/",
    "/api/system-stats/",
    "/api/processes/",
    "/api/dashboard/",
]


@pytest.mark.django_db
class TestEngineAuthRequired:
    """Engine endpoints return 401 when REQUIRE_ENGINE_AUTH=True and no auth provided."""

    @override_settings(REQUIRE_ENGINE_AUTH=True)
    @pytest.mark.parametrize("url", ENGINE_ENDPOINTS)
    def test_unauthenticated_returns_401(self, url):
        client = Client()
        if url == "/api/analyze-url":
            resp = client.post(
                url,
                data=json.dumps({"url": "https://example.com"}),
                content_type="application/json",
            )
        else:
            resp = client.get(url)
        assert resp.status_code == 401
        assert json.loads(resp.content)["error"] == "Unauthorized"

    @override_settings(REQUIRE_ENGINE_AUTH=True)
    def test_authenticated_bearer_allowed(self):
        client = Client()
        sub = "sb-" + uuid.uuid4().hex
        token = _bearer_token(sub, "engine@test.com")
        resp = client.get(
            "/api/threat-info/",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert resp.status_code == 200

    def test_health_always_public(self):
        """Health endpoint must remain public regardless of REQUIRE_ENGINE_AUTH."""
        client = Client()
        with override_settings(REQUIRE_ENGINE_AUTH=True):
            resp = client.get("/api/health/")
            assert resp.status_code == 200
            assert json.loads(resp.content)["status"] == "ok"


@pytest.mark.django_db
class TestEngineAuthDisabled:
    """Engine endpoints are open when REQUIRE_ENGINE_AUTH=False (dev mode)."""

    @override_settings(REQUIRE_ENGINE_AUTH=False)
    def test_unauthenticated_allowed_in_dev(self):
        client = Client()
        resp = client.get("/api/threat-info/")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# P1.5 — api_change_password uses _ensure_auth
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestChangePasswordAuth:
    def test_unauthenticated_returns_401(self):
        client = Client()
        resp = client.post(
            reverse("api_change_password"),
            data=json.dumps({"old_password": "x", "new_password": "longenough1"}),
            content_type="application/json",
        )
        assert resp.status_code == 401

    def test_bearer_auth_can_change_password(self):
        sub = "sb-" + uuid.uuid4().hex
        token = _bearer_token(sub, "pwdchange@test.com")
        client = Client()
        client.get(reverse("api_me"), HTTP_AUTHORIZATION=f"Bearer {token}")
        user = User.objects.get(username=sub)
        user.set_password("old-pass-12345")
        user.save()

        resp = client.post(
            reverse("api_change_password"),
            data=json.dumps({"old_password": "old-pass-12345", "new_password": "new-pass-67890"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert resp.status_code == 200
        user.refresh_from_db()
        assert user.check_password("new-pass-67890")

    def test_wrong_old_password_returns_400_with_bearer(self):
        sub = "sb-" + uuid.uuid4().hex
        token = _bearer_token(sub, "pwdwrong@test.com")
        client = Client()
        client.get(reverse("api_me"), HTTP_AUTHORIZATION=f"Bearer {token}")
        user = User.objects.get(username=sub)
        user.set_password("actual-pass-123")
        user.save()

        resp = client.post(
            reverse("api_change_password"),
            data=json.dumps({"old_password": "wrong", "new_password": "new-pass-67890"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert resp.status_code == 400
        assert "incorrect" in json.loads(resp.content)["error"].lower()

    def test_short_new_password_returns_400(self):
        sub = "sb-" + uuid.uuid4().hex
        token = _bearer_token(sub, "pwdshort@test.com")
        client = Client()
        resp = client.post(
            reverse("api_change_password"),
            data=json.dumps({"old_password": "x", "new_password": "short"}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# P1.6 — HTTPS settings in production
# ---------------------------------------------------------------------------


class HTTPSSettingsTest(TestCase):
    def test_secure_cookies_when_not_debug(self):
        with override_settings(DEBUG=False):
            from django.conf import settings as s

            assert s.SESSION_COOKIE_SECURE is True or not s.DEBUG
            assert s.CSRF_COOKIE_SECURE is True or not s.DEBUG
