# Monix deployment plan (Next.js serverless + Supabase)

This document is the operational checklist for shipping Monix as a single Next.js application with Route Handlers and Supabase Postgres.

## 1. Prerequisites

- A Supabase project (Auth enabled, Postgres available).
- A hosting target that supports Next.js App Router and serverless or Node functions (for example Vercel, or any platform that runs `next start` / the framework adapter you choose).
- Google Cloud OAuth client (Web application) for Search Console API access.
- Optional: Google PageSpeed Insights API key.

## 2. Database

1. In the Supabase SQL editor (or `psql`), run the migrations in order:

   - `supabase/migrations/000001_monix_core.sql`
   - `supabase/migrations/000002_monix_user_names.sql`

2. Confirm tables exist: `monix_users`, `monix_targets`, `monix_scans`, `monix_gsc_credentials`, `monix_cloudflare_credentials`.

3. If you are migrating from a legacy deployment, load historical rows into these tables before cutover (column names and Fernet-encrypted blobs must match what the Next.js server expects).

## 3. Environment configuration

Set variables in the host dashboard (production). Minimum:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Supabase client |
| `NEXT_PUBLIC_SITE_URL` | Public origin of the app, no trailing slash (used for SSR fetches to `/api/*`) |
| `SUPABASE_URL` | Server: same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server: service role (never expose to the browser) |
| `SUPABASE_JWKS_URL` | e.g. `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json` |
| `SUPABASE_JWT_AUD` | Typically `authenticated` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | GSC OAuth |
| `GOOGLE_REDIRECT_URI` | Must exactly match an authorized redirect URI, e.g. `https://<your-domain>/api/gsc/callback` |

Strongly recommended:

| Variable | Purpose |
| --- | --- |
| `GOOGLE_REFRESH_TOKEN_FERNET_KEY` | Dedicated secret for encrypting refresh tokens and Cloudflare tokens at rest |
| `MONIX_GSC_STATE_SECRET` | Secret for short-lived OAuth `state` JWTs (optional; can derive from Fernet key material) |
| `GSC_OAUTH_SUCCESS_URL` / `GSC_OAUTH_ERROR_URL` | Post-OAuth browser landing pages |
| `PAGESPEED_API_KEY` | Higher PageSpeed quota |

Do not set `MONIX_VERIFY_SUPABASE_JWT=false` in production.

## 4. Google Cloud Console

1. Under **Credentials**, edit the OAuth 2.0 Web client.
2. **Authorized redirect URIs**: add your production `GOOGLE_REDIRECT_URI` (path `/api/gsc/callback`).
3. **Authorized JavaScript origins**: add your site origin (e.g. `https://app.example.com`).
4. If the OAuth consent screen is in **Testing**, add every Google account that will connect Search Console under **Test users**.

## 5. Build and release

1. Install dependencies: `cd web && bun install` (or the package manager your CI uses).
2. Run quality gates locally or in CI: `bun run lint`, `bun run test`, `bun run build`.
3. Deploy the `web/` application artifact to your host with all server env vars configured.
4. Smoke test after deploy:
   - `GET /api/health`
   - Sign in (Supabase)
   - `GET /api/auth/me` with session
   - Create a target, run a scan, open a report
   - GSC: connect flow returns to success URL; Analytics shows data after sync
   - Cloudflare: connect, list zones, load analytics for a matching hostname

### Optional: one-command VPS setup (PM2 + Nginx + SSL)

If you are deploying this repository on a Linux server directly, use:

```bash
cd <repo-root>
LETSENCRYPT_EMAIL=you@example.com sudo bash scripts/setup-server.sh
```

What this script does:

- Installs Node.js 22, Bun, PM2, Nginx, Certbot, and the Nginx Certbot plugin
- Builds and starts the Next.js app with PM2 from `web/` on port `3000`
- Configures Nginx reverse proxy for `monix.dineshkorukonda.in`
- Provisions and enables Let's Encrypt SSL for the same subdomain

Optional overrides:

- `DOMAIN` (default: `monix.dineshkorukonda.in`)
- `APP_PORT` (default: `3000`)
- `APP_NAME` (default: `monix-web`)
- `APP_DIR` (default: `<repo-root>/web`)

After you update production env variables, restart PM2:

```bash
sudo -u <server-user> pm2 restart monix-web
```

## 6. Cutover from a legacy stack

1. Freeze writes on the old API during migration window if needed.
2. Backfill `monix_*` tables and verify row counts and spot-check reports.
3. Point DNS / CDN to the new Next.js deployment.
4. Update `GOOGLE_REDIRECT_URI` and Google Console redirect URIs to the new origin.
5. Remove old backend URLs from any bookmarks or integrations.

## 7. Ongoing operations

- Rotate `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_REFRESH_TOKEN_FERNET_KEY` on a schedule appropriate to your policy; re-encrypt stored tokens if you change the Fernet key (users may need to reconnect GSC / Cloudflare).
- Monitor serverless function duration and timeouts for long scans; tune `maxDuration` on heavy routes if your host supports it.
- Dashboard endpoints that aggregate host metrics (`/api/dashboard`, `/api/system-stats`, etc.) return placeholder or lightweight data in serverless; treat them as UX stubs unless you add a real metrics backend.
