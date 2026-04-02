"""
Google Search Console OAuth and API client.

All Google HTTP calls happen here; views delegate to these functions.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import os
import urllib.parse
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

import requests
from cryptography.fernet import Fernet
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
GSC_SITES_URL = "https://www.googleapis.com/webmasters/v3/sites"
WEBMASTERS_READONLY = "https://www.googleapis.com/auth/webmasters.readonly"

GSC_OAUTH_SCOPES = [
    "openid",
    "email",
    "profile",
    WEBMASTERS_READONLY,
]


def _fernet() -> Fernet:
    raw = os.environ.get("GOOGLE_REFRESH_TOKEN_FERNET_KEY")
    if raw:
        return Fernet(raw.strip().encode("ascii"))
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_refresh_token(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_refresh_token(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")


def google_oauth_config() -> tuple[str, str, str]:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = (
        os.environ.get("GOOGLE_REDIRECT_URI", "").strip()
        or os.environ.get("GOOGLE_REDIRECT_URL", "").strip()
    )
    return client_id, client_secret, redirect_uri


def build_authorization_url(state: str) -> str:
    client_id, client_secret, redirect_uri = google_oauth_config()
    missing = []
    if not client_id:
        missing.append("GOOGLE_CLIENT_ID")
    if not redirect_uri:
        missing.append("GOOGLE_REDIRECT_URI (or GOOGLE_REDIRECT_URL)")
    if missing:
        raise RuntimeError(
            "Google OAuth is not configured: set "
            + ", ".join(missing)
            + " in the environment. "
            "GOOGLE_REDIRECT_URI / GOOGLE_REDIRECT_URL must match an authorized redirect URI in Google Cloud "
            "(e.g. http://localhost:8000/api/auth/google/callback/ for local dev)."
        )
    if not client_secret:
        logger.warning(
            "GOOGLE_CLIENT_SECRET is empty; token exchange after OAuth will fail until it is set."
        )

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(GSC_OAUTH_SCOPES),
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
    }
    return f"{GOOGLE_AUTH_URI}?{urllib.parse.urlencode(params)}"


@dataclass
class TokenBundle:
    access_token: str
    refresh_token: str | None
    expires_in: int | None


def exchange_code_for_tokens(code: str) -> TokenBundle:
    client_id, client_secret, redirect_uri = google_oauth_config()
    if not client_secret:
        raise RuntimeError("GOOGLE_CLIENT_SECRET must be set.")

    resp = requests.post(
        GOOGLE_TOKEN_URI,
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if not resp.ok:
        logger.warning("Google token exchange failed: %s %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
    data = resp.json()
    return TokenBundle(
        access_token=data["access_token"],
        refresh_token=data.get("refresh_token"),
        expires_in=data.get("expires_in"),
    )


def refresh_access_token(refresh_token_plain: str) -> TokenBundle:
    client_id, client_secret, _ = google_oauth_config()
    resp = requests.post(
        GOOGLE_TOKEN_URI,
        data={
            "refresh_token": refresh_token_plain,
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "refresh_token",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if not resp.ok:
        logger.warning("Google token refresh failed: %s %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
    data = resp.json()
    return TokenBundle(
        access_token=data["access_token"],
        refresh_token=None,
        expires_in=data.get("expires_in"),
    )


def list_sites(access_token: str) -> list[dict[str, Any]]:
    resp = requests.get(
        GSC_SITES_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=60,
    )
    if not resp.ok:
        logger.warning("GSC list sites failed: %s %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
    payload = resp.json()
    return list(payload.get("siteEntry") or [])


def search_analytics_query(
    site_url: str,
    access_token: str,
    *,
    start_date: date,
    end_date: date,
    dimensions: list[str] | None = None,
    row_limit: int = 25,
) -> dict[str, Any]:
    encoded = urllib.parse.quote(site_url, safe="")
    url = f"https://www.googleapis.com/webmasters/v3/sites/{encoded}/searchAnalytics/query"
    body: dict[str, Any] = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dataState": "all",
    }
    if dimensions is not None:
        body["dimensions"] = dimensions
        body["rowLimit"] = row_limit
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=90,
    )
    if not resp.ok:
        logger.warning(
            "GSC searchAnalytics failed for %s: %s %s",
            site_url,
            resp.status_code,
            resp.text[:500],
        )
        resp.raise_for_status()
    return resp.json()


def default_analytics_date_range() -> tuple[date, date]:
    end = timezone.now().date()
    start = end - timedelta(days=28)
    return start, end


def normalize_hostname(host: str | None) -> str | None:
    if not host:
        return None
    h = host.lower()
    if h.startswith("www."):
        return h[4:]
    return h


def gsc_property_matches_target(site_url: str, target_url: str) -> bool:
    """Return True if a GSC site entry matches the target URL's host."""
    t_parts = urllib.parse.urlparse(target_url)
    th = normalize_hostname(t_parts.hostname)
    if not th:
        return False

    su = site_url.strip()
    if su.startswith("sc-domain:"):
        dom = su.split(":", 1)[1].strip().lower().rstrip("/")
        if th == dom:
            return True
        if th.endswith("." + dom):
            return True
        return False

    p = urllib.parse.urlparse(su if "://" in su else f"https://{su}")
    sh = normalize_hostname(p.hostname)
    if not sh:
        return False
    return th == sh


def pick_matching_site_url(sites: list[dict[str, Any]], target_url: str) -> str | None:
    """Return the GSC siteUrl string for the property that matches the target, if any."""
    for entry in sites:
        s_url = (entry.get("siteUrl") or "").strip()
        if s_url and gsc_property_matches_target(s_url, target_url):
            return s_url
    return None


def summarize_analytics_rows(rows: list[dict[str, Any]] | None) -> dict[str, float | None]:
    """Aggregate clicks, impressions, weighted CTR and position from API rows."""
    rows = rows or []
    if not rows:
        return {
            "clicks": None,
            "impressions": None,
            "ctr": None,
            "position": None,
        }
    total_clicks = sum(float(r.get("clicks") or 0) for r in rows)
    total_impr = sum(float(r.get("impressions") or 0) for r in rows)
    ctr = (total_clicks / total_impr) if total_impr else None
    # Weight position by impressions when present
    pos_num = sum(float(r.get("position") or 0) * float(r.get("impressions") or 0) for r in rows)
    pos = (pos_num / total_impr) if total_impr else None
    return {
        "clicks": total_clicks,
        "impressions": total_impr,
        "ctr": ctr,
        "position": pos,
    }


def fetch_gsc_bundle_for_site(
    site_url: str,
    access_token: str,
    start: date | None = None,
    end: date | None = None,
) -> dict[str, Any]:
    """Fetch aggregate metrics plus top queries for a verified site."""
    if start is None or end is None:
        start_d, end_d = default_analytics_date_range()
    else:
        start_d, end_d = start, end

    total_payload = search_analytics_query(
        site_url, access_token, start_date=start_d, end_date=end_d, dimensions=None
    )
    total_rows = total_payload.get("rows") or []
    summary = summarize_analytics_rows(total_rows)

    queries_payload = search_analytics_query(
        site_url,
        access_token,
        start_date=start_d,
        end_date=end_d,
        dimensions=["query"],
        row_limit=50,
    )
    q_rows = queries_payload.get("rows") or []
    top_queries = []
    for r in q_rows:
        keys = r.get("keys") or []
        q = keys[0] if keys else ""
        top_queries.append(
            {
                "query": q,
                "clicks": float(r.get("clicks") or 0),
                "impressions": float(r.get("impressions") or 0),
                "ctr": float(r.get("ctr") or 0),
                "position": float(r.get("position") or 0),
            }
        )

    return {
        "summary": summary,
        "top_queries": top_queries,
        "start_date": start_d.isoformat(),
        "end_date": end_d.isoformat(),
    }
