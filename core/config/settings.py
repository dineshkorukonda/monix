"""
Django settings for the Monix reports/admin project.
"""

import os
import urllib.parse
from pathlib import Path
from dotenv import load_dotenv

# 1. Define BASE_DIR (This is /core)
BASE_DIR = Path(__file__).resolve().parent.parent

# 2. Load .env from the root folder (/monix/.env)
# BASE_DIR is /core, so .parent is the root.
env_path = BASE_DIR.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

print(f"--- DEBUG: Loading env from: {env_path} ---")
print(f"--- DEBUG: DATABASE_URL is: {os.environ.get('DATABASE_URL')} ---")

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-#xu!9!outt7%1wp3(6*qje+l-7h!&e84=nzys=xu+vyfnj=xjg",
)

DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = (
    os.environ.get("ALLOWED_HOSTS", "").split(",")
    if os.environ.get("ALLOWED_HOSTS")
    else []
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "axes",
    "reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "axes.middleware.AxesMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

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

_database_url = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/monix")
_parsed = urllib.parse.urlparse(_database_url)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": _parsed.path.lstrip("/") or "monix",
        "USER": _parsed.username or "postgres",
        "PASSWORD": _parsed.password or "postgres",
        "HOST": _parsed.hostname or "127.0.0.1",
        "PORT": str(_parsed.port or 5432),
    }
}

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
