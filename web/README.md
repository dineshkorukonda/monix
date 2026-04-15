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

Configure `web/.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DJANGO_URL` (optional compatibility endpoint)
- `NEXT_PUBLIC_USE_NEXT_INTEGRATION_API`
- `NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION`
- `NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST`

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
