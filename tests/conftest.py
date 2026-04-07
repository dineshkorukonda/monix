"""Pytest hooks — keep background scan monitor off during the test suite."""

import os


def pytest_configure():
    os.environ.setdefault("DJANGO_SKIP_SCAN_MONITOR", "1")
    os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-not-for-production")
    os.environ.setdefault("DEBUG", "True")
    # Use local HS256 verification for tests (no JWKS network calls).
    os.environ.setdefault("SUPABASE_JWT_SECRET", "test-supabase-jwt-secret")
    os.environ.setdefault("SUPABASE_JWT_AUD", "authenticated")
