# Monix Architecture

Monix is now a **Next.js-only** application.

## System Overview

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI + Server Runtime | Next.js 16, React 19, TypeScript | Routing, rendering, route handlers, dashboard UX |
| Integrations | Next.js server routes | Google Search Console + Cloudflare API orchestration |
| Auth | Supabase Auth | User sign-in/sign-up and JWT-based identity |
| Data/API access | `web/src/lib` + `web/src/server` | API client, service/repository abstractions, integration wiring |

## Repository Layout

| Path | Purpose |
| --- | --- |
| `web/src/app` | App Router pages and route handlers |
| `web/src/components` | Shared UI components |
| `web/src/lib` | Client utilities and feature flags |
| `web/src/server` | Server-side integration/domain layers |
| `web/src/**/*.test.ts` | TypeScript/JavaScript test suite |
| `.github/workflows/ci.yml` | CI: lint, test, build |

## Runtime Flow

```text
Browser
  |
  v
Next.js App Router (web/src/app)
  |                \
  |                 +--> Next route handlers (integration endpoints)
  v
Server/domain/services (web/src/server)
  |
  +--> Supabase Auth
  +--> Google APIs
  +--> Cloudflare APIs
```

## Quality Workflow

All quality checks run in the `web/` package:

- `bun run lint`
- `bun run test`
- `bun run build`
