# Monix Web Engine

> Fast, zero-auth website reconnaissance, security header auditor & SEO directive inspector.

Built with **Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS, Bun)**.

---

## Quick Start

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to inspect any URL.

---

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/scan` | `POST` | Executes full analysis on a URL (5 req/hr per IP rate limit) and returns slug |
| `/api/r/[slug]` | `GET` | Fetches stored scan results by public slug |
| `/api/health` | `GET` | System and database health status |

---

## Database Bootstrap

```sql
\i sql/init.sql
```

Creates:
- `public.monix_scans`
- `public.monix_rate_limits`
