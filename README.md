# Monix

Monix is a **Next.js-only** web security, SEO, and performance analysis application.

Documentation lives in **[`docs/`](./docs/README.md)** (architecture, deployment, web app setup).

## Project layout

| Path | Role |
| --- | --- |
| [`web/`](./web/) | Next.js 16 app (React 19, TypeScript, Bun) |
| [`docs/`](./docs/) | Markdown documentation |
| [`supabase/migrations/`](./supabase/migrations/) | SQL schema for `monix_*` tables (apply to Supabase Postgres) |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | CI for lint, JS/TS tests, and production build |

## Local setup

```bash
cd web
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` at the repo root (or use `web/.env.local`) and configure Supabase, `NEXT_PUBLIC_SITE_URL`, Google OAuth for GSC (`GOOGLE_REDIRECT_URI` must match `/api/gsc/callback`), and optional `PAGESPEED_API_KEY`. See `.env.example` and [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Testing

```bash
cd web
bun run test
```

## Quality checks

```bash
cd web
bun run lint
bun run build
```

CI runs lint, JS/TS tests, and production build on pushes and pull requests to `main`.
