"""
Models for the reports app.

Scan stores the raw result of a URL security scan.
Report wraps a Scan with expiry metadata.
Both are persisted to the shared PostgreSQL database that Flask also writes to.
"""

import uuid
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Scan(models.Model):
    """Represents one URL security scan result."""

    report_id = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        db_index=True,
        help_text="Public-facing identifier used to look up this scan result.",
    )
    url = models.URLField(max_length=2048, help_text="The URL that was scanned.")
    score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Threat score from 0 (safe) to 100 (critical).",
    )
    results = models.JSONField(help_text="Full scan result payload returned by the Flask engine.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Scan {self.report_id} — {self.url} (score={self.score})"


class Report(models.Model):
    """Wraps a Scan with expiry information."""

    scan = models.OneToOneField(Scan, on_delete=models.CASCADE, related_name="report")
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField(help_text="Timestamp after which this report is considered expired.")

    class Meta:
        ordering = ["-scan__created_at"]

    def __str__(self) -> str:
        status = "expired" if self.is_expired else "active"
        return f"Report for {self.scan.report_id} ({status})"
