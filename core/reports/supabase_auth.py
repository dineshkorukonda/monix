from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

import jwt
from jwt import PyJWKClient
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SupabaseIdentity:
    sub: str
    email: str | None
    first_name: str
    last_name: str


def _bearer_token(request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth:
        auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth:
        return None
    if not auth.lower().startswith("bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    return token or None


def _supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")


def _jwks_url() -> str:
    explicit = (os.environ.get("SUPABASE_JWKS_URL") or "").strip()
    if explicit:
        return explicit
    url = _supabase_url()
    if not url:
        return ""
    return f"{url}/auth/v1/.well-known/jwks.json"


def _issuer() -> str | None:
    # Supabase JWT issuer is typically: <SUPABASE_URL>/auth/v1
    explicit = (os.environ.get("SUPABASE_JWT_ISSUER") or "").strip()
    if explicit:
        return explicit
    url = _supabase_url()
    return f"{url}/auth/v1" if url else None


def _audiences() -> list[str]:
    raw = (os.environ.get("SUPABASE_JWT_AUD") or "authenticated").strip()
    return [a.strip() for a in raw.split(",") if a.strip()]


def _decode(token: str) -> dict[str, Any]:
    """
    Verify and decode a Supabase JWT.

    - **HS256** (tests, legacy): requires ``SUPABASE_JWT_SECRET`` (JWT Secret from
      Supabase Settings → API — not the anon key).
    - **RS256 / ES256** (default Supabase user tokens): verified via JWKS at
      ``SUPABASE_URL/auth/v1/.well-known/jwks.json``. Requires ``SUPABASE_URL``
      (or ``SUPABASE_JWKS_URL``).

    We branch on the token header ``alg``. A placeholder ``SUPABASE_JWT_SECRET``
    must not be used with real RS256 tokens — leave the secret unset for JWKS.
    """
    issuer = _issuer()
    audiences = _audiences()
    hs256_secret = (os.environ.get("SUPABASE_JWT_SECRET") or "").strip()
    header = jwt.get_unverified_header(token)
    alg = (header.get("alg") or "HS256").upper()
    unverified_claims = jwt.decode(
        token,
        options={
            "verify_signature": False,
            "verify_exp": False,
            "verify_aud": False,
            "verify_iss": False,
        },
    )

    decode_kw: dict[str, Any] = {
        "options": {"require": ["exp", "sub"]},
        "audience": audiences if audiences else None,
    }
    # Accept legacy/test tokens without `iss` while still validating issuer when present.
    if issuer and unverified_claims.get("iss"):
        decode_kw["issuer"] = issuer

    if alg == "HS256":
        if not hs256_secret:
            raise jwt.InvalidKeyError(
                "HS256 token requires SUPABASE_JWT_SECRET (Supabase Settings → API → JWT Secret)"
            )
        return jwt.decode(token, hs256_secret, algorithms=["HS256"], **decode_kw)

    jwks_url = _jwks_url()
    if not jwks_url:
        raise jwt.InvalidKeyError(
            "Set SUPABASE_URL (or SUPABASE_JWKS_URL) to verify RS256/ES256 Supabase tokens"
        )

    jwks_client = PyJWKClient(
        jwks_url,
        cache_keys=True,
        max_cached_keys=int(os.environ.get("SUPABASE_JWKS_MAX_KEYS", "16")),
    )
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    if alg in ("RS256", "ES256", "RS384", "ES384"):
        algs = [alg]
    else:
        # JWKS key type implies algorithm (Supabase uses RS256 today).
        algs = ["RS256", "ES256"]
    return jwt.decode(token, signing_key.key, algorithms=algs, **decode_kw)


def _split_name(full_name: str | None) -> tuple[str, str]:
    if not full_name:
        return ("", "")
    parts = [p for p in full_name.strip().split(" ") if p]
    if not parts:
        return ("", "")
    if len(parts) == 1:
        return (parts[0], "")
    return (parts[0], " ".join(parts[1:]))


def identity_from_claims(claims: dict[str, Any]) -> SupabaseIdentity:
    sub = str(claims.get("sub") or "")
    email = claims.get("email")
    meta = claims.get("user_metadata") or {}
    if not isinstance(meta, dict):
        meta = {}
    full_name = meta.get("full_name") or meta.get("name")
    first, last = _split_name(full_name)
    if not first and (meta.get("first_name") or meta.get("given_name")):
        first = str(meta.get("first_name") or meta.get("given_name") or "")
    if not last and (meta.get("last_name") or meta.get("family_name")):
        last = str(meta.get("last_name") or meta.get("family_name") or "")
    return SupabaseIdentity(sub=sub, email=email, first_name=first, last_name=last)


def get_or_create_user(identity: SupabaseIdentity) -> User:
    """
    Map a Supabase identity to a Django User row.

    We store the Supabase `sub` in `User.username` (stable unique ID).
    """
    username = identity.sub
    if not username:
        username = get_random_string(20)

    user, created = User.objects.get_or_create(
        username=username,
        defaults={
            "email": (identity.email or "").lower(),
            "first_name": identity.first_name,
            "last_name": identity.last_name,
        },
    )
    if not created:
        dirty = False
        if identity.email and user.email != identity.email.lower():
            user.email = identity.email.lower()
            dirty = True
        if identity.first_name and user.first_name != identity.first_name:
            user.first_name = identity.first_name
            dirty = True
        if identity.last_name and user.last_name != identity.last_name:
            user.last_name = identity.last_name
            dirty = True
        if dirty:
            user.save(update_fields=["email", "first_name", "last_name"])
    return user


def authenticate_request(request) -> User | None:
    """
    Return a Django user for either:
    - Django session auth (request.user.is_authenticated), or
    - Supabase Bearer JWT.
    """
    if getattr(request, "user", None) is not None and request.user.is_authenticated:
        return request.user

    token = _bearer_token(request)
    if not token:
        return None

    try:
        claims = _decode(token)
    except jwt.PyJWTError as e:
        logger.debug("Supabase JWT rejected: %s", e)
        return None
    ident = identity_from_claims(claims)
    return get_or_create_user(ident)

