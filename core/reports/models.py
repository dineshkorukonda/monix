"""
Models for the reports app.

Scan stores the raw result of a URL security scan and expiry metadata
for shareable report URLs.
"""

import uuid
from django.contrib.auth.models import User
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class UserSearchConsoleCredentials(models.Model):
    """Stored OAuth tokens for Google Search Console (refresh token encrypted at rest)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, related_name="search_console_credentials"
    )
    refresh_token_encrypted = models.TextField()
    access_token = models.TextField(blank=True, default="")
    access_token_expires_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Search Console credentials"


class UserCloudflareCredentials(models.Model):
    """Stored Cloudflare API token (encrypted at rest, same Fernet key as GSC)."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="cloudflare_credentials",
    )
    api_token_encrypted = models.TextField()
    account_id = models.CharField(max_length=64, blank=True, default="")
    account_name = models.CharField(max_length=255, blank=True, default="")
    zones_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User Cloudflare credentials"


class Target(models.Model):
    """A Monitored Target belonging to a User."""

    id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="targets")
    url = models.URLField(max_length=2048, help_text="The core production URL being monitored.")
    environment = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    # Google Search Console: matched property URL and cached analytics (JSON), if available.
    gsc_property_url = models.CharField(max_length=2048, blank=True, default="")
    gsc_analytics = models.JSONField(null=True, blank=True)
    gsc_synced_at = models.DateTimeField(null=True, blank=True)
    gsc_sync_error = models.CharField(max_length=512, blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.url} (Owner: {self.owner.email or self.owner.username})"


class Scan(models.Model):
    """Represents one URL security scan result and shareable report lifetime."""

    target = models.ForeignKey(
        Target, on_delete=models.SET_NULL, null=True, blank=True, related_name="scans"
    )

    report_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        help_text="Public-facing identifier used to look up this scan result.",
    )
    url = models.URLField(max_length=2048, help_text="The URL that was scanned.")
    score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Composite posture score 0–100 from the scan engine (higher is better).",
    )
    results = models.JSONField(help_text="Full scan result payload returned by the scan engine.")
    created_at = models.DateTimeField(auto_now_add=True)
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField(
        help_text="Timestamp after which this report is considered expired."
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        status = "expired" if self.is_expired else "active"
        return f"Scan {self.report_id} — {self.url} (score={self.score}, {status})"
