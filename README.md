# Monix

Monix is now a **Next.js-only** web security, SEO, and performance analysis application.

## Project Layout

| Path     | Role                                              |
| -------- | ------------------------------------------------- |
| `web/`   | Next.js 16 app (React 19, TypeScript, Bun)        |
| `.github/workflows/ci.yml` | CI for lint, JS/TS tests, and production build |
| `ARCHITECTURE.md` | High-level system design for the Next.js stack |

## Local Setup

```bash
cd web
bun install
bun run dev
```

The app starts on `http://localhost:3000`.

## Environment Variables

Create `web/.env.local` and configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DJANGO_URL` (optional while transitioning legacy API dependencies)
- `NEXT_PUBLIC_USE_NEXT_INTEGRATION_API`
- `NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION`
- `NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST`

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
