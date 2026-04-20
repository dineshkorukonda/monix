# Monix Web

Monix Web is a Next.js 16 application for security, SEO, and performance analysis dashboards.

## Stack

- Next.js 16
- React 19
- TypeScript
- Bun
- Supabase Auth

## Development

```bash
bun install
bun run dev
```

## Environment

Configure `web/.env.local` (or repo-root `.env`) with at least:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (for server-side fetches during SSR)
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- JWT verification: `SUPABASE_JWKS_URL` + `SUPABASE_JWT_AUD` (or `SUPABASE_JWT_SECRET` for local HS256 tests only)
- Google Search Console: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (e.g. `http://localhost:3000/api/gsc/callback`)

Optional: `NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST=true` for alternate Analytics copy; `PAGESPEED_API_KEY` for higher PageSpeed quotas.

## Testing

Monix now uses JavaScript/TypeScript tests:

```bash
bun run test
```

## Quality gates

```bash
bun run lint
bun run build
```

CI runs lint, test, and build for this app.
