"""
SQLAlchemy integration for Flask scan engine.

This module defines the SQLAlchemy ORM models that mirror the tables created
by the Django ``reports`` app.  Flask uses these models to persist scan results
to the shared PostgreSQL database so that Django can later retrieve and display
them via its ORM and admin panel.

The database URL is read from the ``DATABASE_URL`` environment variable (set in
``.env``).  If the variable is absent (e.g. during unit-testing) the module
degrades gracefully: ``save_scan`` becomes a no-op and callers are not
interrupted.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import dotenv
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker

# Load .env from repo root so DATABASE_URL is available when running Flask
# directly (e.g. ``python app.py``).
dotenv.load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

_DATABASE_URL: Optional[str] = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/monix")

# ---------------------------------------------------------------------------
# Engine & session factory — only created when DATABASE_URL is configured
# ---------------------------------------------------------------------------

_engine = None
_SessionLocal = None

if _DATABASE_URL:
    _engine = create_engine(_DATABASE_URL, pool_pre_ping=True, future=True)
    _SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)


# ---------------------------------------------------------------------------
# ORM base & models
# ---------------------------------------------------------------------------


class _Base(DeclarativeBase):
    pass


class ScanRecord(_Base):
    """
    Mirrors the ``reports_scan`` table created by Django migrations.

    Table name matches Django's default convention: ``<app_label>_<model_name>``.
    """

    __tablename__ = "reports_scan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    report_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True, default=uuid.uuid4)
    url = Column(String(2048), nullable=False)
    score = Column(Integer, nullable=False)
    results = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    report = relationship("ReportRecord", back_populates="scan", uselist=False)


class ReportRecord(_Base):
    """
    Mirrors the ``reports_report`` table created by Django migrations.
    """

    __tablename__ = "reports_report"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(Integer, ForeignKey("reports_scan.id"), nullable=False, unique=True)
    is_expired = Column(Boolean, nullable=False, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)

    scan = relationship("ScanRecord", back_populates="report")


# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

#: Default report lifetime — 30 days from scan time.
DEFAULT_REPORT_TTL_DAYS = 30


def save_scan(url: str, score: int, results: dict, ttl_days: int = DEFAULT_REPORT_TTL_DAYS) -> Optional[str]:
    """Persist a scan result and its associated report record.

    Writes one :class:`ScanRecord` and one :class:`ReportRecord` to the shared
    PostgreSQL database inside a single transaction.

    Args:
        url:      The URL that was scanned.
        score:    Threat score (0–100).
        results:  Full scan result dict (stored as JSONB).
        ttl_days: Number of days before the report expires (default 30).

    Returns:
        The ``report_id`` UUID string of the newly created scan, or ``None``
        when the database is not configured or the write fails.
    """
    if _SessionLocal is None:
        # DATABASE_URL not configured — skip persistence silently.
        return None

    report_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=ttl_days)

    try:
        with _SessionLocal() as session:  # type: Session
            scan = ScanRecord(
                report_id=report_id,
                url=url,
                score=max(0, min(100, score)),
                results=results,
                created_at=now,
            )
            session.add(scan)
            session.flush()  # Populate scan.id so FK is available

            report = ReportRecord(
                scan_id=scan.id,
                is_expired=False,
                expires_at=expires_at,
            )
            session.add(report)
            session.commit()
            return str(report_id)
    except Exception:  # pragma: no cover — DB errors must not break the scan API
        return None
