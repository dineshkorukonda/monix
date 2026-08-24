# Monix

> Fast, standalone website reconnaissance, security header auditor & SEO directive inspector.

Monix is an open website diagnostic platform built with **Next.js 16 (React 19, TypeScript, Tailwind CSS, Bun, and Poppins typography)**.

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
