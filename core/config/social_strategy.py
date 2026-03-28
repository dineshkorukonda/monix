"""
Django social-auth strategy: stable OAuth redirect URIs for Google sign-in.

python-social-auth defaults to ``/api/auth/complete/google-oauth2/``. Monix uses
``/api/auth/google/callback/`` so the same URI can be registered in Google Cloud
as ``GOOGLE_REDIRECT_URI`` (Search Console) and for sign-in; see
``api_auth_google_callback_compat`` which routes by OAuth ``scope``.
"""

from django.conf import settings

from social_django.strategy import DjangoStrategy


def _google_sign_in_callback_path() -> str:
    p = str(settings.SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_PATH).strip()
    if not p.startswith("/"):
        p = f"/{p}"
    if not p.endswith("/"):
        p = f"{p}/"
    return p


class MonixDjangoStrategy(DjangoStrategy):
    def build_absolute_uri(self, path=None):
        p = path
        if p is not None and "complete/google-oauth2" in str(p):
            p = _google_sign_in_callback_path()

        base = getattr(settings, "DJANGO_PUBLIC_BASE_URL", "") or ""
        base = str(base).strip().rstrip("/")
        if base and p is not None:
            pp = p if str(p).startswith("/") else f"/{p}"
            return f"{base}{pp}"
        return super().build_absolute_uri(p)
