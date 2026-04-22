# Monix

Monix is a **Next.js-only** web security, SEO, and performance analysis application.

Documentation lives in **[`docs/`](./docs/README.md)** (architecture, deployment, web app setup).

## Project layout

| Path | Role |
| --- | --- |
| [`web/`](./web/) | Next.js 16 app (React 19, TypeScript, Bun) |
| [`docs/`](./docs/) | Markdown documentation |
| [`web/sql/init.sql`](./web/sql/init.sql) | Single SQL bootstrap for all `monix_*` tables in local Postgres |
| [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) | CI for lint, JS/TS tests, and production build |

## Local setup

```bash
cd web
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

## Environment variables

Copy `.env.example` to `.env` at the repo root (or use `web/.env.local`) and configure `DATABASE_URL`, `MONIX_JWT_SECRET`, `NEXT_PUBLIC_SITE_URL`, Google OAuth for GSC (`GOOGLE_REDIRECT_URI` must match `/api/gsc/callback`), and optional `PAGESPEED_API_KEY`. Apply [`web/sql/init.sql`](./web/sql/init.sql) to your local Postgres before running the app.

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
