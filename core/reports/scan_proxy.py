"""
Internal secret for Django → Flask scan proxy.

When ``MONIX_INTERNAL_SCAN_SECRET`` is unset, a dev-only default is used if
``debug`` is True so local runs work without editing ``.env``. Production must
set the env var explicitly.
"""

import os

_DEV_FALLBACK = "dev-change-me"


def resolve_internal_scan_secret(debug: bool | None = None) -> str:
    explicit = (os.environ.get("MONIX_INTERNAL_SCAN_SECRET") or "").strip()
    if explicit:
        return explicit
    if debug is None:
        debug = os.environ.get("DEBUG", "True").lower() in ("1", "true", "yes")
    if debug:
        return _DEV_FALLBACK
    return ""
