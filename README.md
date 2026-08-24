# Monix

Monix is an open, editorial-first website intelligence platform built with **Next.js 16 (React 19, TypeScript, Tailwind CSS, Bun)**.

It provides instant, unauthenticated evaluations across **Security**, **SEO**, and **Performance** in a single scan, with permanent shareable reports and optional portfolio monitoring.

---

## Features

- **Zero Auth Wall**: Instant scans from the landing page without signing in or creating an account.
- **Permanent Public Reports**: Shareable reports accessible at `/r/[slug]` with flat, editorial diagnostic panels.
- **Three Core Lenses**:
  - **Security**: TLS certificate validation, strict security headers (HSTS, CSP, Framing), DNS host intelligence.
  - **SEO**: Metadata hygiene, Open Graph previews, robots.txt, XML sitemap accessibility.
  - **Performance**: Core Web Vitals, responsiveness indicators, and lab performance scores.
- **Built-in Rate Limiting**: Postgres-backed sliding window rate limiter (5 scans/hour per IP) on `/api/scan`.
- **Power-User Integrations**: Google Search Console and Cloudflare analytics strictly managed behind authenticated settings.

---

## Project Layout

| Path | Description |
|---|---|
| [`web/`](./web/) | Next.js 16 App Router application (`src/app/`, `src/server/`, `src/components/`) |
| [`web/sql/init.sql`](./web/sql/init.sql) | Complete SQL bootstrap schema for PostgreSQL / Supabase |
| [`web/sql/001_phase1_public_slug.sql`](./web/sql/001_phase1_public_slug.sql) | Migration: Add `public_slug` and `trigger` to `monix_scans` |
| [`web/sql/002_rate_limits.sql`](./web/sql/002_rate_limits.sql) | Migration: Add `monix_rate_limits` table |
| [`web/docs/design-tokens.md`](./web/docs/design-tokens.md) | Editorial UI system design tokens & guidelines |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | Continuous integration for lint, tests, and production build |

---

## Quick Start

```bash
cd web
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Database Setup & Migrations

Monix uses PostgreSQL (or Supabase Postgres).

### 1. Fresh Database Setup
Run [`web/sql/init.sql`](./web/sql/init.sql) to create all tables and indexes:
```sql
-- Applies monix_users, monix_targets, monix_scans, monix_rate_limits, etc.
\i web/sql/init.sql
```

### 2. Upgrading Existing Databases (Phase 1)
If you have an existing database, apply the incremental migrations:
```sql
-- 1. Add public_slug and trigger columns to monix_scans
\i web/sql/001_phase1_public_slug.sql

-- 2. Add rate limiting table
\i web/sql/002_rate_limits.sql
```

---

## Environment Variables

Copy `.env.example` to `web/.env.local` and configure the following:

```ini
# PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/monix"

# App base URL
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# JWT Secret for local auth (min 32 chars)
MONIX_JWT_SECRET="your-32-char-random-secret-key"

# Optional: Google Cloud OAuth for Search Console
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI="http://localhost:3000/api/gsc/callback"

# Optional: PageSpeed Insights API Key
PAGESPEED_API_KEY=""

# Optional: Fernet key for credential encryption
FERNET_SECRET_KEY=""
```

---

## Scripts & Quality Checks

Run all commands inside the `web/` directory:

```bash
# Run unit & API test suites
bun run test

# Check code formatting & linting with Biome
bun run lint

# Automatically format codebase
bun run format

# Verify production Next.js build
bun run build
```
