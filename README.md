# Monix

> Fast, standalone website reconnaissance, security header auditor & SEO directive inspector — with uptime monitoring, status pages, certificate tracking, webhook alerting, and native subdomain enumeration.

Monix is an open website diagnostic platform built with **Next.js 16 (React 19, TypeScript, Tailwind CSS, Bun)**.

---

## Features

### Phase 1 — Public Scan Engine
- **Zero Auth Wall**: Instant scans from the landing page without signing in, cookies, or account setup.
- **Permanent Public Reports**: Shareable reports at `/r/[slug]` with dense, monospace diagnostic output.
- **Three Diagnostic Lenses**:
  - **Security**: TLS certificate validation & expiration telemetry, strict security headers (`HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
  - **SEO Directives**: On-page metadata, Open Graph preview tags, `robots.txt`, XML sitemaps, and canonical verification.
  - **Core Web Vitals**: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), Total Blocking Time, and PageSpeed lab metrics.
- **Built-in Rate Limiting**: Sliding window rate limiter (5 scans/hour per IP address) protecting `/api/scan`.
- **cURL & CLI Pipeline Ready**: Direct JSON inspection API for automated pipelines.

### Phase 2 — Ops / Infra Layer
- **Uptime Monitoring**: Automated background pings with incident tracking (2 consecutive failure threshold) and auto-resolution.
- **Public Status Pages**: Per-site public dashboards at `/status/[slug]` — toggleable, with 24h/30d uptime %, response time history, and 30-day incident log.
- **TLS Certificate Expiry Tracking**: Daily background certificate inspection with configurable warning threshold (default 14 days) and issuer tracking.
- **Webhook Alerting**: Real-time JSON webhooks for `incident.started`, `incident.resolved`, and `certificate.expiry_warning` events with automatic 1× retry.
- **Native Subdomain Enumeration**: Pure TypeScript subdomain discovery via Certificate Transparency logs (crt.sh), wildcard DNS detection, and active HTTP liveness probing — no external binaries.
- **Subdomain UI on Reports**: Discovered subdomains shown on `/r/[slug]` report pages with live/DNS badges, IPs, and HTTP status codes.

---

## cURL & API Integration

```bash
# Anonymous scan
curl -s -X POST https://monix.dineshkorukonda.in/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Trigger subdomain scan (authenticated)
curl -s -X POST https://monix.dineshkorukonda.in/api/targets/<target-id>/subdomains \
  -H "Authorization: Bearer <token>"

# List discovered subdomains
curl -s https://monix.dineshkorukonda.in/api/targets/<target-id>/subdomains \
  -H "Authorization: Bearer <token>"
```

---

## Quick Start

```bash
cd web
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Setup

Monix uses PostgreSQL to persist scans, uptime data, incidents, subdomains, and per-target settings.

### Step 1 — Base schema

Apply [`web/sql/init.sql`](./web/sql/init.sql):

```bash
psql $DATABASE_URL -f web/sql/init.sql
```

### Step 2 — Phase 2 migrations (run in order)

Run each file via your Supabase SQL Editor or `psql`:

```bash
psql $DATABASE_URL -f web/sql/003_uptime_and_incidents.sql
psql $DATABASE_URL -f web/sql/004_status_page_toggle.sql
psql $DATABASE_URL -f web/sql/005_certificate_expiry.sql
psql $DATABASE_URL -f web/sql/006_webhook_alerts.sql
psql $DATABASE_URL -f web/sql/007_subdomains.sql
```

| File | What it adds |
|---|---|
| `003_uptime_and_incidents.sql` | `uptime_checks`, `incidents` tables |
| `004_status_page_toggle.sql` | `public_status_page`, `status_slug` columns on `monix_targets` |
| `005_certificate_expiry.sql` | `certificate_expiry_at`, `cert_issuer`, `cert_warning_days` columns |
| `006_webhook_alerts.sql` | `webhook_url` column on `monix_targets` |
| `007_subdomains.sql` | `subdomains` table |

---

## Cron Jobs (Vercel)

Phase 2 requires two background workers. Add these in **Vercel → Settings → Cron Jobs**:

| Route | Schedule | Description |
|---|---|---|
| `/api/cron/uptime` | `*/5 * * * *` | Ping all targets every 5 min |
| `/api/cron/certificates` | `0 2 * * *` | Inspect TLS certs nightly |

You can also trigger them manually or via any external cron service (Upstash, GitHub Actions, cron-job.org).

---

## Environment Variables

Copy `web/.env.example` to `web/.env.local`:

```ini
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/monix"

# App base URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Optional: Google PageSpeed Insights API Key
PAGESPEED_API_KEY=""

# Supabase JWT secret (for authenticated routes)
SUPABASE_JWT_SECRET=""
```

---

## Pages Reference

| Path | Auth | Description |
|---|---|---|
| `/` | Public | Landing page + instant scan |
| `/r/[slug]` | Public | Permanent scan report + subdomain section |
| `/status/[slug]` | Public | Per-site public status page |
| `/docs` | Public | Technical documentation |
| `/docs/webhooks` | Public | Webhook payload reference |
| `/inspector` | Public | Advanced inspector tool |

---

## Verification & Scripts

Run commands inside `web/`:

```bash
# Run test suite
bun test

# Check code formatting & linting with Biome
bun run lint

# Automatically format codebase
bun run format

# Production build check
bun run build
```


---

## Features

- **Zero Auth Wall**: Instant scans from the landing page without signing in, cookies, or account setup.
- **Permanent Public Reports**: Shareable reports accessible at `/r/[slug]` with dense, monospace diagnostic output.
- **Three Diagnostic Lenses**:
  - **Security**: TLS certificate validation & expiration telemetry, strict security headers (`HSTS`, `CSP`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).
  - **SEO Directives**: On-page metadata, Open Graph preview tags, `robots.txt`, XML sitemaps, and canonical verification.
  - **Core Web Vitals**: Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), Total Blocking Time, and PageSpeed lab metrics.
- **Built-in Rate Limiting**: Sliding window rate limiter (5 scans/hour per IP address) protecting `/api/scan`.
- **cURL & CLI Pipeline Ready**: Direct JSON inspection API for automated pipelines.

---

## cURL & API Integration

```bash
curl -s -X POST https://monix.dineshkorukonda.in/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

## Quick Start

```bash
cd web
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Setup

Monix uses PostgreSQL to persist public reports and manage rate limits.

Apply [`web/sql/init.sql`](./web/sql/init.sql):

```sql
-- Creates public.monix_scans and public.monix_rate_limits
\i web/sql/init.sql
```

---

## Environment Variables

Copy `web/.env.example` to `web/.env.local`:

```ini
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/monix"

# App base URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Optional: Google PageSpeed Insights API Key
PAGESPEED_API_KEY=""
```

---

## Verification & Scripts

Run commands inside `web/`:

```bash
# Run test suite
bun run test

# Check code formatting & linting with Biome
bun run lint

# Automatically format codebase
bun run format

# Production build check
bun run build
```
