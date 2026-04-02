"""
Django settings for the Monix reports/admin project.
"""

import os
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# 1. Define BASE_DIR (This is /core)
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. Load .env from the root folder (/monix/.env)
# BASE_DIR is /core, so .parent is the root.
env_path = BASE_DIR.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-#xu!9!outt7%1wp3(6*qje+l-7h!&e84=nzys=xu+vyfnj=xjg",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

# Frontend origin (no trailing slash). Used for CORS and OAuth redirects.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")

ALLOWED_HOSTS = (
    os.environ.get("ALLOWED_HOSTS", "").split(",") if os.environ.get("ALLOWED_HOSTS") else []
)

# Public origin of this Django app (no trailing slash). Used for Google OAuth
# redirect_uri so it matches Google Cloud Console exactly (avoids localhost vs
# 127.0.0.1 mismatches). In DEBUG, defaults to http://localhost:8000 when unset.
DJANGO_PUBLIC_BASE_URL = os.environ.get("DJANGO_PUBLIC_BASE_URL", "").strip().rstrip("/")
if not DJANGO_PUBLIC_BASE_URL and DEBUG:
    DJANGO_PUBLIC_BASE_URL = "http://localhost:8000"

INSTALLED_APPS = [
    "corsheaders",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "axes",
    "social_django",
    "reports.apps.ReportsConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "axes.middleware.AxesMiddleware",
    "config.middleware.AppendSlashApiMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Allow Next.js server to make cross-origin requests to Django.
# CORS_ALLOW_CREDENTIALS lets the browser send session cookies.
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
# DEBUG: browser may use http://<LAN-IP>:3000 while API is http://127.0.0.1:8000 (direct fetch).
if DEBUG:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r"^http://localhost:\d+$",
        r"^http://127\.0\.0\.1:\d+$",
        r"^http://10\.\d+\.\d+\.\d+:\d+$",
        r"^http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$",
        r"^http://192\.168\.\d+\.\d+:\d+$",
    ]
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "social_core.backends.google.GoogleOAuth2",
    "django.contrib.auth.backends.ModelBackend",
]

# Stable OAuth redirect URIs (see config.social_strategy.MonixDjangoStrategy).
SOCIAL_AUTH_STRATEGY = "config.social_strategy.MonixDjangoStrategy"
# Sign-in redirect path sent to Google (must match Console + api_auth_google_callback_compat).
_SOCIAL_LOGIN_REDIRECT = os.environ.get("GOOGLE_LOGIN_REDIRECT_PATH", "").strip()
SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_PATH = (
    _SOCIAL_LOGIN_REDIRECT or "/api/auth/google/callback/"
)

# Google Search Console OAuth callback redirect (browser returns here after consent).
GSC_OAUTH_SUCCESS_URL = os.environ.get(
    "GSC_OAUTH_SUCCESS_URL",
    f"{FRONTEND_URL}/dashboard/projects?gsc=connected",
)
GSC_OAUTH_ERROR_URL = os.environ.get(
    "GSC_OAUTH_ERROR_URL",
    f"{FRONTEND_URL}/dashboard/projects?gsc=error",
)

# Google OAuth2 — obtain credentials at console.cloud.google.com
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.environ.get("GOOGLE_CLIENT_ID", "")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = ["email", "profile"]
# After Google login, redirect back to the Next.js dashboard
SOCIAL_AUTH_LOGIN_REDIRECT_URL = f"{FRONTEND_URL}/dashboard"
SOCIAL_AUTH_NEW_USER_REDIRECT_URL = f"{FRONTEND_URL}/dashboard"
SOCIAL_AUTH_LOGIN_ERROR_URL = f"{FRONTEND_URL}/login?error=google"
# Google OAuth: show account picker so users can switch Google accounts on a shared device.
SOCIAL_AUTH_GOOGLE_OAUTH2_AUTH_EXTRA_ARGUMENTS = {
    "access_type": "online",
    "prompt": "select_account",
}
# Dev: OAuth redirect URLs use http, not https unless in production.
SOCIAL_AUTH_REDIRECT_IS_HTTPS = os.environ.get("SOCIAL_AUTH_REDIRECT_IS_HTTPS", "False") == "True"
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = ["first_name", "last_name", "picture"]

AXES_FAILURE_LIMIT = int(os.environ.get("AXES_FAILURE_LIMIT", 5))
AXES_COOLOFF_TIME = int(os.environ.get("AXES_COOLOFF_TIME", 1))

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

_database_url = (os.environ.get("DATABASE_URL") or "").strip()
if not _database_url:
    raise ImproperlyConfigured(
        "DATABASE_URL is required (PostgreSQL). Set it in the environment or .env."
    )

_parsed = urllib.parse.urlparse(_database_url)
_db_name = _parsed.path.lstrip("/") or "monix"
_db_host = _parsed.hostname or "127.0.0.1"
_db_port = _parsed.port or 5432

# Pass libpq/psycopg2 options from DATABASE_URL query string, e.g.
# ?sslmode=require&connect_timeout=15
_qs = urllib.parse.parse_qs(_parsed.query, keep_blank_values=False)
_db_options: dict = {}
for _key, _vals in _qs.items():
    if not _vals:
        continue
    _db_options[_key] = _vals[-1]

# Coerce common numeric libpq options (query values are strings).
_int_option_keys = frozenset(
    {
        "connect_timeout",
        "keepalives",
        "keepalives_idle",
        "keepalives_interval",
        "keepalives_count",
    }
)
for _k in list(_db_options.keys()):
    if _k in _int_option_keys:
        try:
            _db_options[_k] = int(_db_options[_k])
        except (TypeError, ValueError):
            pass

def _is_supabase_or_managed_postgres(host: str) -> bool:
    h = (host or "").lower()
    return "supabase.co" in h or "pooler.supabase.com" in h


# Supabase / managed Postgres: require SSL and TCP keepalives to reduce
# "SSL SYSCALL error: Operation timed out" on flaky networks (VPN/NAT).
if _is_supabase_or_managed_postgres(_db_host) or os.environ.get("DATABASE_SSLMODE"):
    _db_options.setdefault("sslmode", os.environ.get("DATABASE_SSLMODE", "require"))
    _db_options.setdefault("connect_timeout", int(os.environ.get("DATABASE_CONNECT_TIMEOUT", "30")))
    _db_options.setdefault("keepalives", 1)
    _db_options.setdefault("keepalives_idle", int(os.environ.get("DATABASE_KEEPALIVES_IDLE", "30")))
    _db_options.setdefault("keepalives_interval", int(os.environ.get("DATABASE_KEEPALIVES_INTERVAL", "10")))
    _db_options.setdefault("keepalives_count", int(os.environ.get("DATABASE_KEEPALIVES_COUNT", "3")))

_default_db: dict = {
    "ENGINE": "django.db.backends.postgresql",
    "NAME": _db_name,
    "USER": _parsed.username or "postgres",
    "PASSWORD": _parsed.password or "postgres",
    "HOST": _db_host,
    "PORT": str(_db_port),
}
if _db_options:
    _default_db["OPTIONS"] = _db_options

DATABASES = {"default": _default_db}

# PgBouncer (Supabase pooler port 6543, transaction mode): server-side cursors break.
if _db_port == 6543:
    CONN_MAX_AGE = 0
    DISABLE_SERVER_SIDE_CURSORS = True

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Session cookies for the Next.js dashboard (cross-origin to :8000 with credentials).
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
