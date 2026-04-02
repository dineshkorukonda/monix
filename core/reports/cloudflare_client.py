"""
Cloudflare API v4 client (token verify, zones, GraphQL zone HTTP analytics).

HTTP/GraphQL calls are isolated here; views delegate to these functions.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

CLOUDFLARE_V4 = "https://api.cloudflare.com/client/v4"

# Zone Analytics REST dashboard is sunset; we use GraphQL (see Cloudflare migration guide).
_ZONE_HTTP_ANALYTICS_QUERY = """
query ZoneHttpAnalytics($zoneTag: string!, $start: Date!, $end: Date!) {
  viewer {
    zones(filter: {zoneTag: $zoneTag}) {
      daily: httpRequests1dGroups(
        limit: 400
        orderBy: [date_ASC]
        filter: { date_geq: $start, date_lt: $end }
      ) {
        dimensions {
          date
        }
        sum {
          requests
          cachedRequests
          bytes
          pageViews
          threats
          countryMap {
            clientCountryName
            requests
          }
          responseStatusMap {
            edgeResponseStatus
            requests
          }
        }
        uniq {
          uniques
        }
      }
    }
  }
}
"""


class CloudflareApiError(Exception):
    """Raised when Cloudflare returns success=false or HTTP errors."""


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token.strip()}", "Content-Type": "application/json"}


def _graphql(
    token: str,
    query: str,
    variables: dict[str, Any],
    *,
    timeout: int = 60,
) -> dict[str, Any]:
    """POST /graphql — response uses GraphQL ``data`` / ``errors`` (not REST ``success``)."""
    url = f"{CLOUDFLARE_V4}/graphql"
    try:
        r = requests.post(
            url,
            headers=_headers(token),
            json={"query": query, "variables": variables},
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning("Cloudflare GraphQL HTTP error: %s", exc)
        raise CloudflareApiError("Could not reach Cloudflare.") from exc

    try:
        body = r.json()
    except ValueError as exc:
        logger.warning("Cloudflare GraphQL non-JSON %s: %s", r.status_code, r.text[:200])
        raise CloudflareApiError("Invalid response from Cloudflare.") from exc

    errs = body.get("errors")
    if errs:
        msgs: list[str] = []
        for e in errs:
            if isinstance(e, dict) and e.get("message"):
                msgs.append(str(e["message"]))
            else:
                msgs.append(str(e))
        raise CloudflareApiError("; ".join(msgs)[:800] if msgs else "GraphQL error")

    if r.status_code >= 400:
        raise CloudflareApiError(f"HTTP {r.status_code}")

    data = body.get("data")
    if not isinstance(data, dict):
        raise CloudflareApiError("Empty GraphQL data.")
    return data


def _request(
    method: str,
    path: str,
    token: str,
    *,
    params: dict[str, Any] | None = None,
    timeout: int = 45,
) -> Any:
    url = f"{CLOUDFLARE_V4}{path}"
    try:
        r = requests.request(
            method,
            url,
            headers=_headers(token),
            params=params,
            timeout=timeout,
        )
    except requests.RequestException as exc:
        logger.warning("Cloudflare HTTP error %s %s: %s", method, path, exc)
        raise CloudflareApiError("Could not reach Cloudflare.") from exc

    try:
        data = r.json()
    except ValueError as exc:
        logger.warning("Cloudflare non-JSON %s: %s", r.status_code, r.text[:200])
        raise CloudflareApiError("Invalid response from Cloudflare.") from exc

    if not data.get("success"):
        msgs = [str(e.get("message", "")) for e in data.get("errors", []) if e]
        err = "; ".join(msgs) if msgs else "Cloudflare API error"
        raise CloudflareApiError(err[:500])

    if r.status_code >= 400:
        raise CloudflareApiError(f"HTTP {r.status_code}")

    return data.get("result")


def verify_token(token: str) -> None:
    """Call GET /user/tokens/verify; raises CloudflareApiError if invalid."""
    result = _request("GET", "/user/tokens/verify", token)
    if not isinstance(result, dict):
        return
    st = (result.get("status") or "").lower()
    if st and st != "active":
        raise CloudflareApiError("API token is not active.")


def list_accounts(token: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        batch = _request(
            "GET",
            "/accounts",
            token,
            params={"page": page, "per_page": 50},
        )
        if not isinstance(batch, list):
            break
        out.extend(batch)
        if len(batch) < 50:
            break
        page += 1
    return out


def list_zones_all(token: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    page = 1
    while True:
        batch = _request(
            "GET",
            "/zones",
            token,
            params={"page": page, "per_page": 50},
        )
        if not isinstance(batch, list):
            break
        out.extend(batch)
        if len(batch) < 50:
            break
        page += 1
    return out


@dataclass(frozen=True)
class ConnectSummary:
    account_id: str
    account_name: str
    zones_count: int


def summarize_for_connect(token: str) -> ConnectSummary:
    """
    Verify the token and derive account label + zone count for persistence.

    Prefers account metadata from the first zone (includes account id/name when zone read is allowed).
    """
    verify_token(token)
    zones = list_zones_all(token)
    if zones:
        acc = (zones[0].get("account") or {}) if isinstance(zones[0], dict) else {}
        aid = str(acc.get("id") or "")
        aname = str(acc.get("name") or "").strip()
        if not aname:
            aname = "Cloudflare"
        return ConnectSummary(account_id=aid, account_name=aname, zones_count=len(zones))

    try:
        accounts = list_accounts(token)
    except CloudflareApiError:
        accounts = []
    if accounts:
        a0 = accounts[0]
        return ConnectSummary(
            account_id=str(a0.get("id") or ""),
            account_name=str(a0.get("name") or "Cloudflare").strip() or "Cloudflare",
            zones_count=0,
        )

    return ConnectSummary(account_id="", account_name="Cloudflare", zones_count=0)


def get_zone(token: str, zone_id: str) -> dict[str, Any]:
    """GET /zones/:id — used to resolve zone name for analytics."""
    result = _request("GET", f"/zones/{zone_id}", token)
    if not isinstance(result, dict):
        raise CloudflareApiError("Zone not found.")
    return result


def zones_to_api_rows(zones: list[dict[str, Any]]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for z in zones:
        if not isinstance(z, dict):
            continue
        plan = z.get("plan") if isinstance(z.get("plan"), dict) else {}
        plan_name = str(plan.get("name") or plan.get("legacy_id") or "")
        rows.append(
            {
                "id": str(z.get("id") or ""),
                "name": str(z.get("name") or ""),
                "status": str(z.get("status") or ""),
                "plan_name": plan_name,
            }
        )
    return [r for r in rows if r["id"]]


def _merge_countries(maps: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    by_country: dict[str, int] = {}
    for cmap in maps:
        for c in cmap:
            if not isinstance(c, dict):
                continue
            cc = str(c.get("clientCountryName") or "")
            by_country[cc] = by_country.get(cc, 0) + int(c.get("requests") or 0)
    out = [{"country": k, "requests": v} for k, v in by_country.items() if k]
    out.sort(key=lambda x: x["requests"], reverse=True)
    return out


def _merge_status_codes(maps: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    by_status: dict[str, int] = {}
    for smap in maps:
        for s in smap:
            if not isinstance(s, dict):
                continue
            code = s.get("edgeResponseStatus")
            key = str(code) if code is not None else ""
            by_status[key] = by_status.get(key, 0) + int(s.get("requests") or 0)
    out = [{"status": k, "requests": v} for k, v in by_status.items() if k]
    out.sort(key=lambda x: x["requests"], reverse=True)
    return out


def _parse_graphql_zone_analytics(
    data: dict[str, Any],
    *,
    zone_id: str,
    zone_name: str,
    period_days: int,
) -> dict[str, Any]:
    viewer = data.get("viewer") or {}
    zones = viewer.get("zones")
    if not zones or not isinstance(zones, list) or not zones[0]:
        raise CloudflareApiError("Zone not found or no analytics access.")

    z = zones[0]
    if not isinstance(z, dict):
        raise CloudflareApiError("Invalid zone analytics response.")

    daily = z.get("daily") or []
    if not isinstance(daily, list):
        daily = []

    series: list[dict[str, Any]] = []
    country_maps: list[list[dict[str, Any]]] = []
    status_maps: list[list[dict[str, Any]]] = []

    for row in daily:
        if not isinstance(row, dict):
            continue
        dims = row.get("dimensions") if isinstance(row.get("dimensions"), dict) else {}
        dt = str(dims.get("date") or "")[:10]
        if not dt:
            continue
        s = row.get("sum") if isinstance(row.get("sum"), dict) else {}
        u = row.get("uniq") if isinstance(row.get("uniq"), dict) else {}
        series.append(
            {
                "date": dt,
                "requests": int(s.get("requests") or 0),
                "cached_requests": int(s.get("cachedRequests") or 0),
                "threats": int(s.get("threats") or 0),
                "bandwidth": int(s.get("bytes") or 0),
                "pageviews": int(s.get("pageViews") or 0),
                "uniques": int(u.get("uniques") or 0),
            }
        )
        cm = s.get("countryMap") or []
        sm = s.get("responseStatusMap") or []
        if isinstance(cm, list) and cm:
            country_maps.append([x for x in cm if isinstance(x, dict)])
        if isinstance(sm, list) and sm:
            status_maps.append([x for x in sm if isinstance(x, dict)])

    totals: dict[str, int] = {
        "requests": sum(int(x["requests"]) for x in series),
        "cached_requests": sum(int(x["cached_requests"]) for x in series),
        "bandwidth_bytes": sum(int(x["bandwidth"]) for x in series),
        "threats": sum(int(x["threats"]) for x in series),
        "pageviews": sum(int(x["pageviews"]) for x in series),
        "uniques": sum(int(x["uniques"]) for x in series),
    }

    top_countries = _merge_countries(country_maps) if country_maps else []
    status_codes = _merge_status_codes(status_maps) if status_maps else []

    return {
        "zone_id": zone_id,
        "zone_name": zone_name,
        "period_days": period_days,
        "totals": totals,
        "series": series,
        "top_countries": top_countries[:32],
        "status_codes": status_codes[:32],
    }


def fetch_zone_analytics_dashboard(
    token: str,
    *,
    zone_id: str,
    zone_name: str,
    days: int,
) -> dict[str, Any]:
    """Fetch zone HTTP analytics via GraphQL ``httpRequests1dGroups`` (REST dashboard is sunset)."""
    if days < 1:
        days = 1
    if days > 366:
        days = 366
    end = datetime.now(timezone.utc)
    start_dt = end - timedelta(days=days)
    start_d = start_dt.date()
    end_d = end.date()
    # date_lt is exclusive
    end_exclusive = end_d + timedelta(days=1)

    variables = {
        "zoneTag": zone_id,
        "start": start_d.isoformat(),
        "end": end_exclusive.isoformat(),
    }
    data = _graphql(token, _ZONE_HTTP_ANALYTICS_QUERY, variables)
    return _parse_graphql_zone_analytics(
        data,
        zone_id=zone_id,
        zone_name=zone_name,
        period_days=days,
    )
