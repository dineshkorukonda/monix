"""Persist scan results using the Django ORM (replaces SQLAlchemy ``api.db``)."""

from __future__ import annotations

import logging
import uuid
from datetime import timedelta
from typing import Any

from django.utils import timezone

from .models import Scan

logger = logging.getLogger(__name__)

DEFAULT_REPORT_TTL_DAYS = 30


def save_scan_result(
    url: str,
    score: int,
    results: dict[str, Any],
    target_id: str | None = None,
    ttl_days: int = DEFAULT_REPORT_TTL_DAYS,
) -> str | None:
    """
    Create a Scan row with expiry metadata. Returns ``report_id`` as a string, or ``None`` on failure.
    """
    t_id = None
    if target_id and str(target_id).strip():
        try:
            t_id = uuid.UUID(str(target_id).strip())
        except (ValueError, TypeError):
            logger.warning("save_scan_result: invalid target_id %r", target_id)

    report_id = uuid.uuid4()
    now = timezone.now()
    expires_at = now + timedelta(days=ttl_days)

    try:
        Scan.objects.create(
            report_id=report_id,
            target_id=t_id,
            url=url,
            score=max(0, min(100, int(score))),
            results=results,
            is_expired=False,
            expires_at=expires_at,
        )
        logger.info("save_scan_result persisted report_id=%s", report_id)
        return str(report_id)
    except Exception:
        logger.exception("save_scan_result failed")
        return None
