"""
One-time script to create the 12 feature issues for the Monix project.

Requires the GITHUB_TOKEN environment variable (provided automatically by
GitHub Actions).  Issues and labels that already exist are skipped so the
script is safe to run multiple times.

Usage (in CI):
    python scripts/create_issues.py
"""

import os
import sys
import time
import requests

OWNER = "dineshkorukonda"
REPO = "monix"
BASE_URL = f"https://api.github.com/repos/{OWNER}/{REPO}"

TOKEN = os.environ.get("GITHUB_TOKEN", "")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN environment variable is not set.")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------

LABELS = {
    "enhancement": {"color": "a2eeef", "description": "New feature or request"},
    "backend": {"color": "0075ca", "description": "Backend / server-side work"},
    "database": {"color": "e4e669", "description": "Database changes"},
    "frontend": {"color": "d93f0b", "description": "Frontend / UI work"},
    "security": {"color": "b60205", "description": "Security improvement"},
    "testing": {"color": "0e8a16", "description": "Tests and quality assurance"},
}


def ensure_label(name: str, color: str, description: str) -> None:
    """Create a label if it doesn't already exist."""
    resp = requests.get(f"{BASE_URL}/labels/{requests.utils.quote(name)}", headers=HEADERS)
    if resp.status_code == 200:
        print(f"  Label '{name}' already exists — skipping.")
        return
    payload = {"name": name, "color": color, "description": description}
    resp = requests.post(f"{BASE_URL}/labels", json=payload, headers=HEADERS)
    if resp.status_code == 201:
        print(f"  Created label '{name}'.")
    else:
        print(f"  WARNING: Could not create label '{name}': {resp.status_code} {resp.text[:120]}")


def ensure_all_labels() -> None:
    print("Ensuring labels exist…")
    for name, meta in LABELS.items():
        ensure_label(name, meta["color"], meta["description"])


# ---------------------------------------------------------------------------
# Issue definitions
# ---------------------------------------------------------------------------

ISSUES = [
    {
        "title": "Issue 1 — Django app setup and shared database",
        "labels": ["enhancement", "backend", "database"],
        "body": """\
## Overview
Set up a Django application inside the Monix repo that shares a PostgreSQL
database with the existing Flask scan engine. Django handles report
management, admin, and data retrieval. Flask continues to handle scan
execution.

## Why
Separating concerns (scan execution vs. report persistence / admin) keeps
Flask lightweight while giving Django's ORM and admin panel full access to
stored scan data without duplicating the database.

## Implementation checklist
- [ ] Create Django project in `core/` directory
- [ ] Create `reports` Django app
- [ ] Create `Scan` model: `id`, `report_id` (UUID), `url`, `score` (int 0-100), `results` (JSONField), `created_at`
- [ ] Create `Report` model: `scan` (OneToOne), `is_expired` (bool), `expires_at` (DateTime)
- [ ] Run `makemigrations` and `migrate`
- [ ] Configure Django to use same `DATABASE_URL` as Flask via `python-dotenv`
- [ ] Wire Flask to write scan results to PostgreSQL using SQLAlchemy after each scan
- [ ] Verify both Flask and Django read/write to same database
""",
    },
    {
        "title": "Issue 2 — Django admin panel",
        "labels": ["enhancement", "backend", "frontend"],
        "body": """\
## Overview
Set up Django admin for managing scans and reports. The admin panel is
protected behind Django auth login.

## Why
Provides administrators with a built-in, zero-effort UI to inspect, filter,
and bulk-manage scan records and reports without building a custom dashboard.

## Implementation checklist
- [ ] Register `Scan` model in `admin.py` with list display: `url`, `score`, `created_at`, `report_id`
- [ ] Register `Report` model with list display: `url`, `is_expired`, `expires_at`
- [ ] Add search by URL in admin
- [ ] Add filter by score range and date in admin
- [ ] Add custom admin action to mark reports as expired
- [ ] Add custom admin action to delete scans older than 30 days
- [ ] Document `createsuperuser` step in README
""",
    },
    {
        "title": "Issue 3 — Django auth and admin login",
        "labels": ["enhancement", "security", "backend"],
        "body": """\
## Overview
Protect the Django admin panel behind authentication. Only authenticated
admins can access scan data and reports.

## Why
The admin panel exposes sensitive scan results and user data. Without
authentication, anyone who can reach the URL can view or modify all records.

## Implementation checklist
- [ ] Enable Django's built-in auth (`django.contrib.auth`)
- [ ] Ensure admin panel redirects unauthenticated users to login page
- [ ] Add rate limiting on admin login attempts (`django-axes` or custom middleware)
- [ ] Document superuser creation in README
- [ ] Add `DJANGO_SECRET_KEY` to `.env.example` with generation instructions
""",
    },
    {
        "title": "Issue 4 — SEO analysis checker",
        "labels": ["enhancement", "backend"],
        "body": """\
## Overview
Add an SEO check module to the Flask scan engine using BeautifulSoup4 and
`requests`. It is called as part of every scan and returns structured
per-check results plus an overall SEO score.

## Why
SEO health is a key indicator of a site's quality and visibility. Surfacing
common SEO issues (missing meta tags, absent robots.txt, etc.) in one scan
gives users immediate, actionable feedback.

## Implementation checklist
- [ ] Create `api/seo_checker.py`
- [ ] Ensure `beautifulsoup4` is in `requirements.txt`
- [ ] Implement checks:
  - [ ] Meta title (presence + ideal length 50-60 chars)
  - [ ] Meta description (presence + ideal length 150-160 chars)
  - [ ] Open Graph tags (`og:title`, `og:description`, `og:image`)
  - [ ] `robots.txt` presence
  - [ ] `sitemap.xml` presence
  - [ ] Canonical tag
  - [ ] H1 tag presence and count
- [ ] Each check returns `{ status: pass|warn|fail, detail: string }`
- [ ] Return overall SEO score as `int` 0-100
- [ ] Integrate into main scan pipeline in `api/server.py`
- [ ] Write tests in `tests/test_seo_checker.py` covering each check with mock HTML
""",
    },
    {
        "title": "Issue 5 — Performance checker via PageSpeed API",
        "labels": ["enhancement", "backend"],
        "body": """\
## Overview
Add a performance check module that calls the Google PageSpeed Insights API
to retrieve Lighthouse scores and Core Web Vitals for both mobile and
desktop.

## Why
Performance metrics (LCP, CLS, FID) directly affect user experience and
SEO ranking. Integrating PageSpeed data gives scans a professional-grade
performance dimension without running Lighthouse locally.

## Implementation checklist
- [ ] Create `api/performance_checker.py`
- [ ] Read `PAGESPEED_API_KEY` from environment
- [ ] Call PageSpeed Insights API for both `mobile` and `desktop` strategies
- [ ] Extract: performance score, accessibility score, LCP, FID, CLS, best-practices score
- [ ] Handle API errors gracefully — return `null` scores without breaking the scan
- [ ] Add `PAGESPEED_API_KEY=` to `.env.example`
- [ ] Integrate into main scan pipeline in `api/server.py`
- [ ] Write tests in `tests/test_performance_checker.py` using mocked API responses
""",
    },
    {
        "title": "Issue 6 — Overall score calculation",
        "labels": ["enhancement", "backend"],
        "body": """\
## Overview
Calculate a single overall score (0-100) for each scan based on weighted
results from security, SEO, and performance checks.

## Why
Users need a single, easy-to-understand number that summarises the health of
a target. Weighting categories by importance (security > SEO > performance)
provides a meaningful composite score.

## Implementation checklist
- [ ] Create `api/scoring.py`
- [ ] Apply weights: security 50 %, SEO 30 %, performance 20 %
- [ ] Each category score is 0-100 (pass = full points, warn = half, fail = zero)
- [ ] Return `{ overall: int, security: int, seo: int, performance: int }`
- [ ] Store overall score in `Scan.score` field in database
- [ ] Write tests in `tests/test_scoring.py` with known inputs and expected outputs
""",
    },
    {
        "title": "Issue 7 — Shareable report URL",
        "labels": ["enhancement", "backend", "frontend"],
        "body": """\
## Overview
Every scan generates a unique UUID-based report URL that persists for 30
days. Anyone with the link can view the full report without rescanning.

## Why
Sharing scan results is a core use-case: developers send report links to
teammates or clients. Persistent, linkable reports dramatically improve
the utility of the platform.

## Implementation checklist
- [ ] Generate `report_id` UUID on scan creation in Flask
- [ ] Save to `Scan.report_id` field in database
- [ ] Add Django view: `GET /api/reports/<report_id>` — returns full scan results JSON
- [ ] Return 404 if report not found or expired
- [ ] Add URL route in Django `urls.py`
- [ ] Return `report_url` in Flask scan response: `{ ..., report_url: "/report/<uuid>" }`
- [ ] Write tests in `tests/test_django_views.py` for report retrieval, 404 on missing, 404 on expired
""",
    },
    {
        "title": "Issue 8 — Report expiry system",
        "labels": ["enhancement", "backend"],
        "body": """\
## Overview
Reports expire 30 days after creation. Expired reports return 404 and are
cleaned up from the database periodically.

## Why
Keeping stale reports indefinitely wastes database space and risks exposing
outdated security information. A 30-day TTL balances usability with storage
efficiency.

## Implementation checklist
- [ ] Set `Report.expires_at = created_at + 30 days` on scan creation
- [ ] In Django report view, check `expires_at < now` before returning data — return 404 if expired
- [ ] Create Django management command `python manage.py expire_reports` that sets `is_expired=True` on all past-due reports
- [ ] Add Django admin action to manually expire a report
- [ ] Write tests for expiry logic in `tests/test_django_models.py`
""",
    },
    {
        "title": "Issue 9 — Next.js report page",
        "labels": ["enhancement", "frontend"],
        "body": """\
## Overview
Add a report page to the Next.js frontend at `/report/[id]` that fetches
and displays the full scan results for a given report UUID.

## Why
The shareable report URL (Issue 7) needs a rich frontend page to be useful.
Users should see scores, individual check results, and be able to share or
re-scan from the same page.

## Implementation checklist
- [ ] Create `web/src/app/report/[id]/page.tsx`
- [ ] Fetch report data from `GET /api/reports/:id` on page load
- [ ] Show 404 state if report not found or expired
- [ ] Display overall score prominently (large number, colour-coded: red < 50, amber 50-75, green > 75)
- [ ] Display per-category scores: security, SEO, performance
- [ ] Show individual check results grouped by category with pass / warn / fail indicators
- [ ] Show scan URL, scan date, expiry date
- [ ] Add "Scan again" button that pre-fills the homepage input with the same URL
- [ ] Add copy-to-clipboard button for the report URL
""",
    },
    {
        "title": "Issue 10 — Real-time homepage stats",
        "labels": ["enhancement", "frontend", "backend"],
        "body": """\
## Overview
Make the homepage stats (total scans, active targets, threats flagged) real
by pulling from the database instead of showing hard-coded placeholder
numbers.

## Why
Live statistics make the platform feel active and trustworthy. Placeholder
numbers undermine credibility and provide no value to the user.

## Implementation checklist
- [ ] Add Django view: `GET /api/stats` returning `{ total_scans, scans_today, avg_score, low_score_count }`
  - `total_scans` — COUNT of all `Scan` records
  - `scans_today` — COUNT of scans where `created_at >= today midnight`
  - `avg_score` — AVG of all `Scan.score` values
  - `low_score_count` — COUNT of scans where `score < 50` (threats flagged)
- [ ] Update Next.js homepage to fetch from `/api/stats` on load
- [ ] Auto-refresh stats every 60 seconds
- [ ] Write tests for stats view in `tests/test_django_views.py`
""",
    },
    {
        "title": "Issue 11 — Rate limiting on scan endpoint",
        "labels": ["enhancement", "security", "backend"],
        "body": """\
## Overview
Prevent abuse of the public scan endpoint by limiting requests per IP
address to 10 scans per hour.

## Why
Without rate limiting, the scan endpoint can be trivially abused to exhaust
server resources, generate excessive third-party API costs, or conduct
enumeration attacks against targets.

## Implementation checklist
- [ ] Install `flask-limiter` and add to `requirements.txt`
- [ ] Apply limit of 10 scans per hour per IP on `POST /api/scan`
- [ ] Return HTTP 429 with a clear error message when limit is exceeded
- [ ] Add `Retry-After` header in 429 response
- [ ] Write tests in `tests/test_flask_api.py` for rate limit response
""",
    },
    {
        "title": "Issue 12 — Test suite expansion",
        "labels": ["testing", "backend"],
        "body": """\
## Overview
Expand the existing test suite to cover all new modules. Target: full
coverage of the scan engine, SEO checker, performance checker, scoring,
Django models, and Django views.

## Why
New modules introduced in Issues 4-11 currently have no automated tests.
Uncovered code paths will inevitably harbour regressions as the codebase
grows.

## Implementation checklist
- [ ] `tests/test_flask_api.py` — scan endpoint happy path, missing URL, invalid URL, rate limit 429
- [ ] `tests/test_seo_checker.py` — each SEO check with mock HTML (pass, warn, fail cases)
- [ ] `tests/test_performance_checker.py` — mocked PageSpeed API response, API failure fallback
- [ ] `tests/test_scoring.py` — known input combinations produce expected overall scores
- [ ] `tests/test_django_models.py` — Scan creation, Report expiry logic, UUID generation
- [ ] `tests/test_django_views.py` — report retrieval 200, 404 missing, 404 expired, stats endpoint
- [ ] All tests runnable with `pytest tests/ -v`
- [ ] Add `pytest` and `pytest-django` to `requirements.txt`
- [ ] Add GitHub Actions CI workflow that runs `pytest tests/` on every push to `main`
""",
    },
]


# ---------------------------------------------------------------------------
# Issue creation
# ---------------------------------------------------------------------------

def get_existing_issue_titles() -> set[str]:
    """Return the set of titles for all open + closed issues in the repo."""
    titles: set[str] = set()
    page = 1
    while True:
        resp = requests.get(
            f"{BASE_URL}/issues",
            headers=HEADERS,
            params={"state": "all", "per_page": 100, "page": page},
        )
        if resp.status_code != 200:
            print(f"  WARNING: Could not list issues: {resp.status_code}")
            break
        data = resp.json()
        if not data:
            break
        for item in data:
            # GitHub issues API also returns pull requests — skip them
            if "pull_request" not in item:
                titles.add(item["title"])
        page += 1
    return titles


def create_issue(title: str, body: str, labels: list[str]) -> None:
    payload = {"title": title, "body": body, "labels": labels}
    resp = requests.post(f"{BASE_URL}/issues", json=payload, headers=HEADERS)
    if resp.status_code == 201:
        url = resp.json().get("html_url", "")
        print(f"  ✓ Created: {title}\n    {url}")
    else:
        print(f"  ✗ Failed ({resp.status_code}): {title}\n    {resp.text[:200]}")


def main() -> None:
    ensure_all_labels()

    print("\nChecking existing issues…")
    existing = get_existing_issue_titles()
    print(f"  Found {len(existing)} existing issue(s).\n")

    print("Creating issues…")
    for issue in ISSUES:
        if issue["title"] in existing:
            print(f"  SKIP (already exists): {issue['title']}")
            continue
        create_issue(issue["title"], issue["body"], issue["labels"])
        time.sleep(1)  # stay well within GitHub's rate limits

    print("\nDone.")


if __name__ == "__main__":
    main()
