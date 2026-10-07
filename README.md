# Monix

> Open website diagnostic platform — instant security, SEO & performance inspection, uptime monitoring, status pages, certificate tracking, webhook alerting, and native subdomain enumeration.

Built with **Next.js 16, TypeScript, Tailwind CSS, and Bun**.

---

## Features

- **Zero Auth Wall** — Instant scans from the landing page. No sign-in, no cookies, no account required.
- **Permanent Public Reports** — Every scan gets a shareable `/r/[slug]` URL with dense, monospace diagnostic output.
- **Security Inspection** — TLS certificate validity & expiration, strict security headers (`HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
- **SEO Directives** — On-page metadata, Open Graph tags, `robots.txt`, XML sitemaps, and canonical verification.
- **Core Web Vitals** — LCP, CLS, Total Blocking Time, and Google PageSpeed Insights lab metrics.
- **Uptime Monitoring** — Automated background pings with incident tracking (2 consecutive failure threshold) and auto-resolution.
- **Public Status Pages** — Per-site public dashboards at `/status/[slug]` with 24h/30d uptime %, response time charts, and 30-day incident log.
- **TLS Certificate Expiry Tracking** — Daily background certificate inspection with configurable warning threshold (default 14 days).
- **Webhook Alerting** — Real-time JSON webhooks for `incident.started`, `incident.resolved`, and `certificate.expiry_warning` events with automatic 1x retry.
- **Native Subdomain Enumeration** — Pure TypeScript subdomain discovery via Certificate Transparency logs, wildcard DNS detection, and active HTTP liveness probing. No external binaries.
- **Rate Limiting** — Sliding window rate limiter (5 scans/hour per IP) protecting the public scan endpoint.
- **cURL & CLI Ready** — Direct JSON API for automated pipelines.

---

## Quick Start

```bash
cp .env.example .env
cd web
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Docker

Install Docker with the Compose plugin, then run these commands from the repository root. Copy the environment template only on first setup, so an existing `.env` is not overwritten:

```bash
cp .env.example .env
docker compose up --build -d
```

Before starting, fill in `.env` with the values needed for your database and integrations (see below). Compose loads this file into the running container; it does not provision PostgreSQL or Supabase.

The `web` service builds from `web/Dockerfile` and maps **host port 3100** to **container port 3000** (`3100:3000`). Open [http://localhost:3100](http://localhost:3100).

Check the service and its health endpoint from the host:

```bash
docker compose ps
curl --fail --show-error http://localhost:3100/api/health
```

In Windows PowerShell, use `curl.exe` for the same curl options. A successful health response is HTTP 200 with:

```json
{"status":"ok","service":"monix-api"}
```

This endpoint confirms that the API is responding; it does not check database or external integration connectivity. If the app is still starting or the request fails, inspect `docker compose logs --tail=100 web` and retry after startup completes.

To stop and remove the Compose containers and network:

```bash
docker compose down
```

---

## Database Setup

Monix uses PostgreSQL. Run migrations via your Supabase SQL Editor or `psql`:

```bash
psql $DATABASE_URL -f web/sql/init.sql
psql $DATABASE_URL -f web/sql/001_phase1_public_slug.sql
psql $DATABASE_URL -f web/sql/002_rate_limits.sql
psql $DATABASE_URL -f web/sql/003_uptime_and_incidents.sql
psql $DATABASE_URL -f web/sql/004_status_page_toggle.sql
psql $DATABASE_URL -f web/sql/005_certificate_expiry.sql
psql $DATABASE_URL -f web/sql/006_webhook_alerts.sql
psql $DATABASE_URL -f web/sql/007_subdomains.sql
```

| Migration file | What it creates |
|---|---|
| `init.sql` | Core tables: `monix_scans`, `monix_targets`, `monix_rate_limits` |
| `001_phase1_public_slug.sql` | Adds `public_slug`, `trigger` to `monix_scans` (legacy-safe) |
| `002_rate_limits.sql` | Ensures `monix_rate_limits` table/indexes exist (legacy-safe) |
| `003_uptime_and_incidents.sql` | `uptime_checks`, `incidents` tables |
| `004_status_page_toggle.sql` | `public_status_page`, `status_slug` columns |
| `005_certificate_expiry.sql` | `certificate_expiry_at`, `cert_issuer`, `cert_warning_days` columns |
| `006_webhook_alerts.sql` | `webhook_url` column |
| `007_subdomains.sql` | `subdomains` table |

All migrations use `IF NOT EXISTS` guards and are safe to re-run.

---

## Cron Jobs

Background workers use two schedulers:

| Route | Scheduler | Schedule | Description |
|---|---|---|---|
| `/api/cron/uptime` | GitHub Actions (`.github/workflows/uptime-cron.yml`) | `*/5 * * * *` | Ping all registered targets every 5 minutes |
| `/api/cron/certificates` | Vercel Cron (`vercel.json`) | `0 2 * * *` | Inspect TLS certificates nightly |

Set the repository variable `MONIX_SITE_URL` to your production origin (default: `https://monix.dineshkorukonda.online`). If `CRON_SECRET` is set in Vercel, add the same value as a GitHub Actions secret so the workflow can authenticate.

You can also trigger `/api/cron/uptime` manually via **Actions → Uptime Ping Cron → Run workflow**, or with any external cron service.

---

## Environment Variables

Copy root `.env.example` to `.env`:

```ini
# Supabase (browser + server)
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""

# JWT verification for authenticated /api/* routes
SUPABASE_JWKS_URL="https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json"
SUPABASE_JWT_AUD="authenticated"
# SUPABASE_JWT_SECRET=""
# MONIX_VERIFY_SUPABASE_JWT="false"

# PostgreSQL connection string
DATABASE_URL="******localhost:5432/monix"

# App base URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Production origin for GitHub Actions uptime cron (repo variable MONIX_SITE_URL)
# MONIX_SITE_URL="https://monix.dineshkorukonda.online"

# Protect /api/cron/* routes (set same value in GitHub Actions secrets)
# CRON_SECRET=""

# Optional: Google Search Console OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/gsc/callback"

# Optional: Google PageSpeed Insights API Key
PAGESPEED_API_KEY=""
```

---

## API

```bash
# Run an anonymous scan
curl -s -X POST https://monix.dineshkorukonda.online/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Trigger a subdomain scan (requires auth)
curl -s -X POST https://monix.dineshkorukonda.online/api/targets/<target-id>/subdomains \
  -H "Authorization: Bearer <token>"

# List discovered subdomains
curl -s https://monix.dineshkorukonda.online/api/targets/<target-id>/subdomains \
  -H "Authorization: Bearer <token>"
```

---

## Pages

| Path | Auth | Description |
|---|---|---|
| `/` | Public | Landing page + instant scan |
| `/r/[slug]` | Public | Permanent scan report with subdomain section |
| `/status` | Public | Status page directory |
| `/status/[slug]` | Public | Per-site public status page |
| `/docs` | Public | Technical documentation |
| `/docs/webhooks` | Public | Webhook payload reference |
| `/inspector` | Public | Advanced inspector tool |
| `/radar` | Public | Fleet radar: live probes for configured targets |
| `/dk-sites` | Signed in | Fleet-managed DK sites |
| `/private-sites` | Signed in | Fleet-managed private sites |

---

## Development Scripts

Run inside `web/`:

```bash
bun test          # Run test suite
bun run lint      # Check formatting & linting (Biome)
bun run format    # Auto-format codebase
bun run build     # Production build check
```
