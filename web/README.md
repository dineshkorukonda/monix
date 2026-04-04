# Monix Web

**Comprehensive Web Security Analysis & Threat Intelligence Platform**

Monix Web is a modern, high-performance web application for real-time URL security scanning, SSL certificate validation, DNS analysis, and threat detection. Built with Next.js and powered by **monix-core**.

## Features

### Core Security Analysis
- **URL Security Scanning** - Comprehensive domain and URL threat assessment
- **SSL/TLS Certificate Validation** - Full certificate chain analysis, expiry tracking, and issuer verification
- **DNS Record Analysis** - A, AAAA, MX, NS, TXT, and CNAME record inspection
- **Security Headers Assessment** - HSTS, CSP, X-Frame-Options, and modern security header scoring
- **Port Scanning** - Common service discovery (HTTP, HTTPS, SSH, FTP, databases)
- **Technology Stack Detection** - Server, CMS, framework, and library identification
- **Geographic Intelligence** - Precise server location and provider mapping
- **Real-time Threat Scoring** - Multi-factor security risk assessment

### Powered by monix-core
Monix Web leverages the battle-tested **monix-core** security system, which includes:
- Advanced threat detection algorithms
- Connection intelligence and pattern analysis
- GeoIP resolution and network mapping
- Process and port analysis
- Real-time security scoring

All security logic resides in monix-core (`../core/scan_engine`), ensuring consistency, reliability, and reusability across the Monix ecosystem.

## Supabase Auth

Sign-in and sign-up run in the browser through **Supabase Auth**. The Django API trusts the Supabase **JWT** (`Authorization: Bearer …`); it does not use Django’s username/password for the main app.

Set these in `web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`)

**Django API (local dev):** In development, the browser calls Django directly at **`http://127.0.0.1:8000`** (unless you set `NEXT_PUBLIC_DJANGO_URL` in `web/.env.local`). That avoids broken `Failed to fetch` when using the **Network** URL (e.g. `http://10.x.x.x:3000`): Django allows those origins in **DEBUG** via CORS regexes. Run Django on **8000** (`./setup.sh dev`) and Next (`./setup.sh web`).

Optional:

- `NEXT_PUBLIC_DJANGO_URL` — override API base (e.g. deployed API). In production builds, set this to your public API URL. Use **`http://`** locally, not `https://`, unless Django serves TLS.
- `BACKEND_INTERNAL_URL` — only for Next **rewrites** in `next.config.ts` if you still proxy `/api/*` through Next.
- `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=false` — hides “Continue with Google” until you enable the Google provider in Supabase (avoids the “provider is not enabled” error during local dev).

### Google sign-in

Google talks to **Supabase first**, not directly to your Next.js app. The `redirect_uri` Google validates is Supabase’s callback URL. If you only register `localhost` in Google Cloud, you get **Error 400: redirect_uri_mismatch**.

1. **Google Cloud Console** → APIs & Services → **Credentials** → your **OAuth 2.0 Client ID** (type: Web application):
   - **Authorized redirect URIs** — add **exactly** (replace `<project-ref>` with yours from `NEXT_PUBLIC_SUPABASE_URL`):
     - `https://<project-ref>.supabase.co/auth/v1/callback`
   - **Authorized JavaScript origins** — include where the app runs, e.g. `http://localhost:3000` and your production origin.
2. **Supabase Dashboard** → **Authentication** → **Providers** → **Google** — enable and paste the same client’s **Client ID** and **Client secret**.
3. **Supabase** → **Authentication** → **URL Configuration** → **Redirect URLs** — allow where users land *after* Supabase finishes (not the Google callback):
   - `http://localhost:3000/dashboard` (and `/login` if you use it)
   - `http://localhost:3000/auth/reset-password` (password reset from email)
   - production URLs when deployed

### Password reset

“Forgot password?” sends a Supabase recovery email. The link must open your app at `/auth/reset-password` (add that URL under Redirect URLs as above).

## Google Search Console & Cloudflare

Third-party metrics are fetched by **Django** (not directly from the browser). The Next.js app calls the Django API with the user’s Supabase JWT.

### Google Search Console

- **Backend:** Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the repo root `.env` (see root [`.env.example`](../.env.example)). After OAuth, Django stores and refreshes tokens and exposes `/api/gsc/*` for status, site list, analytics, sync, and disconnect.
- **Frontend:** Connect or review status under **Dashboard → Integrations** and from **Sites** / site detail when linking Search Console to a monitored URL. Search metrics (clicks, impressions, queries, etc.) show on the main dashboard, **Analytics**, site detail, and related views when the property URL matches your monitored site.

### Cloudflare

- **Backend:** The user submits a **Cloudflare API token**; Django verifies it against the Cloudflare API, then stores it encrypted (same optional Fernet key as GSC: `GOOGLE_REFRESH_TOKEN_FERNET_KEY` in `.env`). Zone listing and HTTP analytics use **Cloudflare API v4** (including **GraphQL** for zone HTTP request series and aggregates).
- **Token permissions:** Create a custom token at [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) with **Zone → Zone → Read** and **Zone → Analytics → Read** for the zones you need (see also [Get started with API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)).
- **Frontend:** **Dashboard → Integrations → Cloudflare** (`/dashboard/integrations/cloudflare`) to connect, pick a zone, and inspect edge charts. When Cloudflare is connected, **Overview**, **Sites**, **Analytics**, and **Issues** also roll up edge totals and signals for any monitored hostname that falls under a Cloudflare zone on that token (apex zones cover `www` and subdomains per the app’s matching rules).

## Testing and CI

There is no Jest/Vitest suite in this package today; quality gates are **Biome** (`bun run lint`) and **production build** (`bun run build`). The monorepo CI job runs `bun install` and `next build` under `web/`. Backend pytest lives at repo root in `tests/`; see the root [README](../README.md#testing) and [tests/README.md](../tests/README.md).
