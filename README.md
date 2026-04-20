# Monix

Monix is now a **Next.js-only** web security, SEO, and performance analysis application.

## Project Layout

| Path     | Role                                              |
| -------- | ------------------------------------------------- |
| `web/`   | Next.js 16 app (React 19, TypeScript, Bun)        |
| `supabase/migrations/` | SQL schema for `monix_*` tables (apply to Supabase Postgres) |
| `.github/workflows/ci.yml` | CI for lint, JS/TS tests, and production build |
| `ARCHITECTURE.md` | High-level system design for the Next.js stack |
| `DEPLOYMENT.md` | Production deployment checklist |

## Local Setup

```bash
cd web
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env` at the repo root (or use `web/.env.local`) and configure Supabase, `NEXT_PUBLIC_SITE_URL`, Google OAuth for GSC (`GOOGLE_REDIRECT_URI` must match `/api/gsc/callback`), and optional `PAGESPEED_API_KEY`. See `.env.example` and `DEPLOYMENT.md`.

## Testing

All tests are JavaScript/TypeScript tests in the Next.js app:

```bash
cd web
bun run test
```

## Quality Checks

```bash
cd web
bun run lint
bun run build
```

CI runs lint + JS/TS tests + production build on pushes and pull requests to `main`.
