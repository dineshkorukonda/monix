# Monix Deployment Guide

This guide covers deploying Monix with:

- **Backend (Flask API + Django)** on [Render](https://render.com) (single Web Service)
- **Next.js frontend** on [Vercel](https://vercel.com) at `monix.dineshkorukonda.in`
- **PostgreSQL** on Render (managed database)
- **Google APIs** (PageSpeed Insights + OAuth 2.0 / Search Console)

---

## Architecture Overview

```
Browser
  │
  ▼
Vercel (Next.js) — monix.dineshkorukonda.in
  │
  └──► Render – Backend (Django + Flask)
            │  Django handles auth, reports, admin, OAuth, GSC (:$PORT public)
            │  Flask runs internally (:3030) for scanning and scoring
            │  Django proxies unmatched /api/* routes to Flask in-process
            ▼
       Render – PostgreSQL  (shared database)
```

Both the Flask scan engine and the Django application run inside the **same
Render Web Service**. Django is the only publicly-exposed process (bound to
`$PORT`). Flask runs on `127.0.0.1:3030` and is never reached directly from
the internet — all traffic flows through Django, which proxies Flask routes
automatically.

---

## 1. PostgreSQL Database (Render)

1. In your Render dashboard click **New → PostgreSQL**.
2. Choose a name (e.g. `monix-db`), region, and plan.
3. After creation, copy the **External Database URL** — it looks like:
   ```
   postgresql://user:password@dpg-xxxx.render.com/monix
   ```
4. Both Flask and Django inside the single service share this database via the
   `DATABASE_URL` environment variable.

---

## 2. Backend on Render (single service)

Flask and Django run together in one Web Service. A startup script launches
Flask in the background on port 3030 and Django in the foreground on `$PORT`.

### 2.1 Create the service

1. **New → Web Service** and connect your GitHub repository.
2. Set the following build & start values:

   | Field | Value |
   |---|---|
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt && pip install -e . && python core/manage.py migrate --no-input && python core/manage.py collectstatic --no-input` |
   | **Start Command** | `bash -c "gunicorn api.server:app --bind 127.0.0.1:3030 --workers 2 & gunicorn core.config.wsgi:application --bind 0.0.0.0:$PORT --workers 2"` |
   | **Root Directory** | *(leave blank — repo root)* |

> **Note:** `PYTHONPATH` must include both the repo root and `core/`.
> Add `PYTHONPATH=/app:/app/core` (or the equivalent absolute path on Render)
> as an environment variable.

### 2.2 Environment variables

Add these in Render → Environment:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL URL from step 1 |
| `DJANGO_SECRET_KEY` | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | Render hostname, e.g. `monix-backend.onrender.com` |
| `DJANGO_PUBLIC_BASE_URL` | Full public URL of this service, e.g. `https://monix-backend.onrender.com` |
| `FLASK_API_URL` | `http://127.0.0.1:3030` (Flask runs internally on the same machine) |
| `FRONTEND_URL` | `https://monix.dineshkorukonda.in` |
| `MONIX_INTERNAL_SCAN_SECRET` | Generate: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API key (see §4) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see §4) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://monix-backend.onrender.com/api/auth/google/callback/` |
| `AXES_FAILURE_LIMIT` | `5` (admin login lockout threshold) |
| `AXES_COOLOFF_TIME` | `1` (lockout duration in hours) |
| `GOOGLE_REFRESH_TOKEN_FERNET_KEY` | Optional — 32-byte url-safe base64 key to encrypt stored GSC tokens. Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `PYTHONPATH` | `/app:/app/core` |
| `PORT` | Render sets this automatically; no need to add manually |

Copy the **public URL** Render assigns (e.g. `https://monix-backend.onrender.com`).
You will need it for the Next.js frontend.

### 2.3 Create a superuser

After the first deploy, open a Render **Shell** for the service and run:

```bash
python core/manage.py createsuperuser
```

The admin panel is then available at
`https://monix-backend.onrender.com/admin/`.

---

## 3. Next.js Frontend on Vercel

### 3.1 Import the project

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub
   repository.
2. Vercel auto-detects Next.js. Set the **Root Directory** to `web`.

### 3.2 Environment variables

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend service URL, e.g. `https://monix-backend.onrender.com` |
| `NEXT_PUBLIC_DJANGO_URL` | Same backend service URL (both apps share one URL now) |

### 3.3 Custom domain

1. In Vercel → Project → Settings → **Domains**, add `monix.dineshkorukonda.in`.
2. Follow the DNS instructions Vercel provides (typically a CNAME record
   pointing to `cname.vercel-dns.com`).
3. Add the same origin to the `FRONTEND_URL` environment variable on the
   Render backend so CORS and OAuth redirects work correctly.

### 3.4 Deploy

Click **Deploy**. Vercel builds with `bun run build` and serves the Next.js
application globally via its CDN.

---

## 4. Google API Setup

Monix uses two Google APIs:

| API | Purpose |
|---|---|
| **PageSpeed Insights API** | Performance and Core Web Vitals data per scan |
| **OAuth 2.0 / Search Console API** | User sign-in and Google Search Console integration |

### 4.1 Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown → **New Project**. Give it a name (e.g. `monix`).
3. Select the new project.

### 4.2 PageSpeed Insights API key

1. Navigate to **APIs & Services → Library**.
2. Search for **PageSpeed Insights API** and click **Enable**.
3. Go to **APIs & Services → Credentials → Create Credentials → API key**.
4. Copy the key and set it as `PAGESPEED_API_KEY` on the backend service.
5. *(Recommended)* Restrict the key: under **API restrictions** select
   **PageSpeed Insights API**; under **Application restrictions** choose
   **IP addresses** and add your Render service IPs.

### 4.3 OAuth 2.0 credentials (sign-in + Search Console)

1. Go to **APIs & Services → Library** and enable:
   - **Google+ API** (or **People API** for profile data)
   - **Google Search Console API**
2. Go to **APIs & Services → OAuth consent screen**:
   - Choose **External** (or **Internal** for a Google Workspace org).
   - Fill in **App name**, **User support email**, and **Developer contact**.
   - Add scopes: `email`, `profile`, `openid`,
     `https://www.googleapis.com/auth/webmasters.readonly`.
   - Under **Test users**, add your Google account if the app is still in
     *Testing* mode — otherwise sign-in is blocked.
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0
   Client ID**:
   - **Application type**: Web application.
   - **Authorized JavaScript origins** — add:
     ```
     https://monix.dineshkorukonda.in
     https://monix-backend.onrender.com
     ```
   - **Authorized redirect URIs** — add **exactly** (trailing slash matters):
     ```
     https://monix-backend.onrender.com/api/auth/google/callback/
     ```
4. Copy the **Client ID** and **Client Secret** and add them to the backend
   service environment as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Set `GOOGLE_REDIRECT_URI` on the backend to match the redirect URI above:
   ```
   https://monix-backend.onrender.com/api/auth/google/callback/
   ```

> **Important:** The redirect URI registered in Google Cloud Console and the
> `GOOGLE_REDIRECT_URI` environment variable must be identical — including the
> trailing slash.

---

## 5. Post-Deployment Checklist

- [ ] PostgreSQL service is running and the external URL is copied.
- [ ] Backend service is live; `/api/health` returns a response.
- [ ] Django admin is accessible at `/admin/`.
- [ ] Django migrations have run (`migrate --no-input` in build command).
- [ ] Superuser created via Render Shell.
- [ ] Vercel deployment is live at `https://monix.dineshkorukonda.in`.
- [ ] Custom domain DNS is configured and verified in Vercel.
- [ ] `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DJANGO_URL` both point to the
  Render backend URL.
- [ ] `PAGESPEED_API_KEY` is set; PageSpeed data appears in scan results.
- [ ] Google OAuth redirect URI is registered and `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` are set.
- [ ] Sign-in flow redirects correctly back to `https://monix.dineshkorukonda.in`.
- [ ] `MONIX_INTERNAL_SCAN_SECRET` is set on the backend service.
- [ ] `FRONTEND_URL` on the backend is set to `https://monix.dineshkorukonda.in`.

---

## 6. Environment Variable Quick Reference

### Backend (Render — single service)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Shared PostgreSQL URL |
| `DJANGO_SECRET_KEY` | ✅ | Long random string |
| `DEBUG` | ✅ | `False` in production |
| `ALLOWED_HOSTS` | ✅ | Render hostname |
| `DJANGO_PUBLIC_BASE_URL` | ✅ | Full https URL of the service |
| `FLASK_API_URL` | ✅ | `http://127.0.0.1:3030` (internal) |
| `FRONTEND_URL` | ✅ | `https://monix.dineshkorukonda.in` |
| `MONIX_INTERNAL_SCAN_SECRET` | ✅ | Random hex secret |
| `PAGESPEED_API_KEY` | ✅ | Google API key |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth credential |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth credential |
| `GOOGLE_REDIRECT_URI` | ✅ | Must match Google Console |
| `PYTHONPATH` | ✅ | `/app:/app/core` |
| `AXES_FAILURE_LIMIT` | Optional | Default `5` |
| `AXES_COOLOFF_TIME` | Optional | Default `1` (hours) |
| `GOOGLE_REFRESH_TOKEN_FERNET_KEY` | Optional | Encrypt stored GSC tokens |
| `PORT` | Auto | Set by Render |

### Next.js (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend service URL (Render, used for Flask scan routes) |
| `NEXT_PUBLIC_DJANGO_URL` | ✅ | Backend service URL (Render, used for auth and reports) |
