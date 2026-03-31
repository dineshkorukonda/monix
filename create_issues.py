#!/usr/bin/env python3
"""
Script to create GitHub issues for the Monix repository.

Usage:
    GITHUB_TOKEN=<your_pat> python3 create_issues.py

The token must have the 'repo' or 'public_repo' scope to create issues.
"""

import json
import os
import sys
import urllib.request
import urllib.error

REPO = "dineshkorukonda/monix"
API_URL = f"https://api.github.com/repos/{REPO}/issues"

ISSUES = [
    {
        "title": "Frontend Makeover and Organisation",
        "body": (
            "## Overview\n\n"
            "Perform a comprehensive frontend makeover to improve the visual design, "
            "code organisation, and overall user experience of the Monix web application.\n\n"
            "## Goals\n\n"
            "- Modernise the UI/UX design with a cleaner, more consistent visual language\n"
            "- Reorganise component structure for better maintainability and scalability\n"
            "- Improve code organisation within `web/src/` (components, pages, hooks, utilities)\n"
            "- Ensure consistent styling patterns across all views\n"
            "- Improve responsiveness and accessibility\n"
            "- Clean up stale or duplicate styling patterns\n\n"
            "## Scope\n\n"
            "- `web/src/` — Next.js pages, components, and styles\n"
            "- App Router layout and navigation structure\n"
            "- Reusable UI primitives and design tokens\n\n"
            "## Acceptance Criteria\n\n"
            "- [ ] Consistent design language across all pages\n"
            "- [ ] Well-structured component hierarchy\n"
            "- [ ] No duplicate or dead styling code\n"
            "- [ ] Lint and build pass (`bun run lint && bun run build`)\n"
            "- [ ] Responsive on common screen sizes\n"
        ),
        "labels": ["enhancement", "frontend"],
    },
    {
        "title": "Cloudflare API Integration for Cloudflare Analytics",
        "body": (
            "## Overview\n\n"
            "Integrate the Cloudflare API to pull Cloudflare Analytics data "
            "(WAF events, traffic stats, bot scores, etc.) as part of the scan "
            "and scoring pipeline.\n\n"
            "## Goals\n\n"
            "- Add a Cloudflare analytics enrichment module in `api/`\n"
            "- Fetch zone-level analytics via the Cloudflare v4 API\n"
            "- Surface relevant data (requests, threats, bandwidth, firewall events) "
            "in scan results and scoring\n"
            "- Handle API errors, missing credentials, and rate limits gracefully\n"
            "- Document required Cloudflare API token scopes\n\n"
            "## Scope\n\n"
            "- `api/` — new Cloudflare analytics enrichment module\n"
            "- Scoring logic to incorporate Cloudflare signals\n"
            "- Environment/config for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`\n\n"
            "## Acceptance Criteria\n\n"
            "- [ ] Cloudflare analytics data fetched and included in scan output\n"
            "- [ ] Graceful degradation when credentials are absent\n"
            "- [ ] Unit tests with mocked Cloudflare API responses\n"
            "- [ ] README / GET_STARTED.sh updated with required env vars\n"
        ),
        "labels": ["enhancement", "api", "cloudflare"],
    },
]


def create_issue(token: str, issue: dict) -> dict:
    payload = json.dumps({"title": issue["title"], "body": issue["body"]}).encode()
    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN", "")
    if not token:
        print("Error: GITHUB_TOKEN environment variable is not set.", file=sys.stderr)
        sys.exit(1)

    for issue in ISSUES:
        try:
            result = create_issue(token, issue)
            print(f"Created issue #{result['number']}: {result['title']}")
            print(f"  URL: {result['html_url']}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode()
            print(f"Failed to create '{issue['title']}': HTTP {exc.code} — {body}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
