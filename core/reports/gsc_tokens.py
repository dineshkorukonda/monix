"""
Django-backed Google Search Console credential refresh and target sync.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from . import gsc_client
from .models import Target, UserSearchConsoleCredentials

logger = logging.getLogger(__name__)

_ACCESS_TOKEN_SKEW = timedelta(seconds=120)


def get_credentials_row(user) -> UserSearchConsoleCredentials | None:
    try:
        return UserSearchConsoleCredentials.objects.get(user=user)
    except UserSearchConsoleCredentials.DoesNotExist:
        return None


def get_valid_access_token(user) -> str | None:
    """
    Return a usable access token, refreshing with the stored refresh token when needed.
    """
    row = get_credentials_row(user)
    if row is None:
        return None

    now = timezone.now()
    if (
        row.access_token
        and row.access_token_expires_at
        and row.access_token_expires_at > now + _ACCESS_TOKEN_SKEW
    ):
        return row.access_token

    try:
        refresh_plain = gsc_client.decrypt_refresh_token(row.refresh_token_encrypted)
    except Exception as exc:
        logger.warning("Could not decrypt GSC refresh token: %s", exc)
        return None

    try:
        bundle = gsc_client.refresh_access_token(refresh_plain)
    except Exception as exc:
        logger.warning("GSC token refresh failed: %s", exc)
        return None

    expires_at = None
    if bundle.expires_in is not None:
        expires_at = now + timedelta(seconds=int(bundle.expires_in))

    row.access_token = bundle.access_token
    row.access_token_expires_at = expires_at
    row.save(update_fields=["access_token", "access_token_expires_at", "updated_at"])
    return bundle.access_token


def save_tokens_from_oauth(
    user,
    *,
    access_token: str,
    refresh_token: str | None,
    expires_in: int | None,
) -> None:
    """Persist tokens after OAuth code exchange (upsert)."""
    now = timezone.now()
    expires_at = None
    if expires_in is not None:
        expires_at = now + timedelta(seconds=int(expires_in))

    with transaction.atomic():
        try:
            row = UserSearchConsoleCredentials.objects.select_for_update().get(user=user)
        except UserSearchConsoleCredentials.DoesNotExist:
            if not refresh_token:
                raise ValueError(
                    "Google did not return a refresh token. Revoke app access in Google "
                    "Account settings and connect again."
                )
            UserSearchConsoleCredentials.objects.create(
                user=user,
                refresh_token_encrypted=gsc_client.encrypt_refresh_token(refresh_token),
                access_token=access_token,
                access_token_expires_at=expires_at,
            )
            return

        if refresh_token:
            row.refresh_token_encrypted = gsc_client.encrypt_refresh_token(refresh_token)
        row.access_token = access_token
        row.access_token_expires_at = expires_at
        row.save(
            update_fields=[
                "refresh_token_encrypted",
                "access_token",
                "access_token_expires_at",
                "updated_at",
            ]
        )


def sync_target_search_console(target: Target) -> None:
    """
    If the owner has GSC connected, find a verified property for this target's URL
    and fetch Search Analytics into ``target.gsc_analytics``.
    """
    user = target.owner
    access = get_valid_access_token(user)
    if not access:
        target.gsc_property_url = ""
        target.gsc_analytics = None
        target.gsc_synced_at = timezone.now()
        target.gsc_sync_error = ""
        target.save(
            update_fields=[
                "gsc_property_url",
                "gsc_analytics",
                "gsc_synced_at",
                "gsc_sync_error",
            ]
        )
        return

    try:
        sites = gsc_client.list_sites(access)
    except Exception as exc:
        logger.warning("GSC list sites failed during target sync: %s", exc)
        target.gsc_synced_at = timezone.now()
        target.gsc_sync_error = "Could not list Search Console properties."
        target.save(update_fields=["gsc_synced_at", "gsc_sync_error"])
        return

    match = gsc_client.pick_matching_site_url(sites, target.url)
    if not match:
        target.gsc_property_url = ""
        target.gsc_analytics = None
        target.gsc_synced_at = timezone.now()
        target.gsc_sync_error = (
            "No verified Search Console property matches this URL's domain."
        )
        target.save(
            update_fields=[
                "gsc_property_url",
                "gsc_analytics",
                "gsc_synced_at",
                "gsc_sync_error",
            ]
        )
        return

    try:
        bundle = gsc_client.fetch_gsc_bundle_for_site(match, access)
    except Exception as exc:
        logger.warning("GSC analytics fetch failed for %s: %s", match, exc)
        target.gsc_property_url = match
        target.gsc_analytics = None
        target.gsc_synced_at = timezone.now()
        target.gsc_sync_error = "Could not fetch Search Analytics for this property."
        target.save(
            update_fields=[
                "gsc_property_url",
                "gsc_analytics",
                "gsc_synced_at",
                "gsc_sync_error",
            ]
        )
        return

    target.gsc_property_url = match
    target.gsc_analytics = bundle
    target.gsc_synced_at = timezone.now()
    target.gsc_sync_error = ""
    target.save(
        update_fields=[
            "gsc_property_url",
            "gsc_analytics",
            "gsc_synced_at",
            "gsc_sync_error",
        ]
    )
