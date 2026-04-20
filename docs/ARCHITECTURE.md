# Monix Architecture

Monix is a **Next.js-only** application.

## System Overview

| Layer | Technology | Responsibility |
| --- | --- | --- |
| UI + Server Runtime | Next.js 16, React 19, TypeScript | Routing, rendering, route handlers, dashboard UX |
| Integrations | Next.js server routes | Google Search Console + Cloudflare API orchestration |
| Auth | Supabase Auth | User sign-in/sign-up and JWT-based identity |
| Data/API access | `web/src/lib` + `web/src/server` | API client, service/repository abstractions, integration wiring |

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/src/app` | App Router pages and route handlers (`app/api/**/route.ts` stay here; they delegate to server modules) |
| `web/src/components` | Shared UI (feature folders such as `dashboard/`, primitives under `ui/`) |
| `web/src/lib` | Browser-safe helpers: API client, Supabase client for the browser, utilities |
| `web/src/server` | Server-only code (secrets, JWT, persistence, integrations) |
| `web/src/server/analysis` | URL/IP analysis, dashboard and threat payloads, scan pipeline (`analyze-url-engine.ts`, etc.) |
| `web/src/server/domain` | Interfaces and domain types (`repositories.ts`, `integrations.ts`) |
| `web/src/server/repositories` | Supabase-backed repository implementations |
| `web/src/server/services` | Application services composed over repositories |
| `web/src/server/integrations` | External HTTP/SDK wrappers (Cloudflare, GSC APIs) |
| `web/src/server/bootstrap` | Composition root for wiring services |
| `web/src/**/*.test.ts` | Bun test suite |
| `docs/` | Markdown documentation for humans (this tree) |
| `supabase/migrations/` | SQL migrations for `monix_*` tables |
| `.github/workflows/ci.yml` | CI: lint, test, build |

## Dependency rules

- **`app/` (routes)**: Parse and validate HTTP, call `server` services or `analysis` modules, return JSON or UI. Avoid embedding SQL or long integration logic in `route.ts` files when a module already exists.
- **`lib/`**: May be imported from client components. Must not import server-only modules that pull in secrets or Node-only assumptions unless behind a documented split.
- **`server/`**: May import `domain` interfaces, `repositories`, `integrations`, `analysis`. Do not import from `components`.
- **`server/analysis`**: Pure server analysis and aggregation; may call `integrations` / `db` where the pipeline requires it.

## Runtime Flow

```text
Browser
  |
  v
Next.js App Router (web/src/app)
  |                \
  |                 +--> Route handlers (/api/*)
  v
Server layer (web/src/server): services, repositories, analysis
  |
  +--> Supabase Auth / Postgres
  +--> Google APIs (GSC)
  +--> Cloudflare APIs
```

## Quality Workflow

All quality checks run in the `web/` package:

- `bun run lint`
- `bun run test`
- `bun run build`
