# Monix Deployment Guide

This guide covers deploying Monix with:

- **Flask API** on [Render](https://render.com) (Web Service)
- **Django** on [Render](https://render.com) (Web Service)
- **Next.js frontend** on [Vercel](https://vercel.com)
- **PostgreSQL** on Render (managed database)
- **Google APIs** (PageSpeed Insights + OAuth 2.0 / Search Console)

---

## Architecture Overview

```
Browser
  │
  ▼
Vercel (Next.js)
  │
  ├──► Render – Django  (reports, admin, OAuth, GSC)
  │
  └──► Render – Flask   (scan engine, scoring, persistence)
            │
            ▼
       Render – PostgreSQL  (shared by both services)
```

---

## 1. PostgreSQL Database (Render)

1. In your Render dashboard click **New → PostgreSQL**.
2. Choose a name (e.g. `monix-db`), region, and plan.
3. After creation, copy the **External Database URL** — it looks like:
   ```
   postgresql://user:password@dpg-xxxx.render.com/monix
   ```
4. Both the Flask and Django services share this single database via the
   `DATABASE_URL` environment variable.

---

## 2. Flask API on Render

The Flask service is the scan engine (`api/`). It is started with Gunicorn.

### 2.1 Create the service

1. **New → Web Service** and connect your GitHub repository.
2. Set the following build & start values:

   | Field | Value |
   |---|---|
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt && pip install -e .` |
   | **Start Command** | `gunicorn api.server:app --bind 0.0.0.0:$PORT --workers 2` |
   | **Root Directory** | *(leave blank — repo root)* |

### 2.2 Environment variables

Add these in Render → Environment:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL URL from step 1 |
| `MONIX_INTERNAL_SCAN_SECRET` | Shared secret between Flask and Django. Generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API key (see §5) |
| `PORT` | Render sets this automatically; no need to add manually |
| `DEBUG` | `False` |

Copy the **public URL** Render assigns to this service (e.g.
`https://monix-api.onrender.com`). You will need it for Django.

---

## 3. Django on Render

The Django service handles reports, the admin panel, and Google OAuth (`core/`).
It reuses the same Docker-compatible image via Gunicorn.

### 3.1 Create the service

1. **New → Web Service** and connect the same repository.
2. Set build & start values:

   | Field | Value |
   |---|---|
   | **Runtime** | Python 3 |
   | **Build Command** | `pip install -r requirements.txt && pip install -e . && python core/manage.py migrate --no-input && python core/manage.py collectstatic --no-input` |
   | **Start Command** | `gunicorn core.config.wsgi:application --bind 0.0.0.0:$PORT --workers 2` |
   | **Root Directory** | *(leave blank — repo root)* |

> **Note:** `PYTHONPATH` must include both the repo root and `core/`.
> Add `PYTHONPATH=/app:/app/core` (or the equivalent absolute path on Render)
> as an environment variable.

### 3.2 Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Same PostgreSQL URL as Flask |
| `DJANGO_SECRET_KEY` | Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | Comma-separated hostnames, e.g. `monix-django.onrender.com` |
| `DJANGO_PUBLIC_BASE_URL` | Full public URL of this Django service, e.g. `https://monix-django.onrender.com` |
| `FLASK_API_URL` | Internal URL of the Flask service, e.g. `https://monix-api.onrender.com` |
| `MONIX_INTERNAL_SCAN_SECRET` | Same value as set on Flask |
| `CORS_ALLOWED_ORIGINS` | Vercel frontend URL, e.g. `https://monix.vercel.app` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see §5) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://monix-django.onrender.com/api/auth/google/callback/` |
| `GSC_OAUTH_SUCCESS_URL` | `https://monix.vercel.app/dashboard/projects?gsc=connected` |
| `GSC_OAUTH_ERROR_URL` | `https://monix.vercel.app/dashboard/projects?gsc=error` |
| `AXES_FAILURE_LIMIT` | `5` (admin login lockout threshold) |
| `AXES_COOLOFF_TIME` | `1` (lockout duration in hours) |
| `GOOGLE_REFRESH_TOKEN_FERNET_KEY` | Optional — 32-byte url-safe base64 key to encrypt stored GSC tokens. Generate: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |

### 3.3 Create a superuser

After the first deploy, open a Render **Shell** for the Django service and run:

```bash
python core/manage.py createsuperuser
```

The admin panel is then available at
`https://monix-django.onrender.com/admin/`.

---

## 4. Next.js Frontend on Vercel

### 4.1 Import the project

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub
   repository.
2. Vercel auto-detects Next.js. Set the **Root Directory** to `web`.

### 4.2 Environment variables

Add these in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Flask service URL, e.g. `https://monix-api.onrender.com` |
| `NEXT_PUBLIC_DJANGO_URL` | Django service URL, e.g. `https://monix-django.onrender.com` |

### 4.3 Deploy

Click **Deploy**. Vercel builds with `bun run build` and serves the Next.js
application globally via its CDN.

---

## 5. Google API Setup

Monix uses two Google APIs:

| API | Purpose |
|---|---|
| **PageSpeed Insights API** | Performance and Core Web Vitals data per scan |
| **OAuth 2.0 / Search Console API** | User sign-in and Google Search Console integration |

### 5.1 Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown → **New Project**. Give it a name (e.g. `monix`).
3. Select the new project.

### 5.2 PageSpeed Insights API key

1. Navigate to **APIs & Services → Library**.
2. Search for **PageSpeed Insights API** and click **Enable**.
3. Go to **APIs & Services → Credentials → Create Credentials → API key**.
4. Copy the key and set it as `PAGESPEED_API_KEY` on the Flask service (and
   optionally Django if you call PageSpeed from there).
5. *(Recommended)* Restrict the key: under **API restrictions** select
   **PageSpeed Insights API**; under **Application restrictions** choose
   **IP addresses** and add your Render service IPs.

### 5.3 OAuth 2.0 credentials (sign-in + Search Console)

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
     https://monix.vercel.app
     https://monix-django.onrender.com
     ```
   - **Authorized redirect URIs** — add **exactly** (trailing slash matters):
     ```
     https://monix-django.onrender.com/api/auth/google/callback/
     ```
4. Copy the **Client ID** and **Client Secret** and add them to Django's
   environment variables as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. Set `GOOGLE_REDIRECT_URI` on Django to match the redirect URI above:
   ```
   https://monix-django.onrender.com/api/auth/google/callback/
   ```

> **Important:** The redirect URI registered in Google Cloud Console and the
> `GOOGLE_REDIRECT_URI` environment variable must be identical — including the
> trailing slash.

---

## 6. Post-Deployment Checklist

- [ ] PostgreSQL service is running and the external URL is copied.
- [ ] Flask service is live; `/health` or a scan request returns a response.
- [ ] Django service is live; `/admin/` is accessible.
- [ ] Django migrations have run (`migrate --no-input` in build command).
- [ ] Superuser created via Render Shell.
- [ ] Vercel deployment is live and can reach both Render services.
- [ ] `PAGESPEED_API_KEY` is set on Flask; PageSpeed data appears in scan
  results.
- [ ] Google OAuth redirect URI is registered and `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` are set on Django.
- [ ] Sign-in flow redirects correctly back to the Vercel frontend.
- [ ] `MONIX_INTERNAL_SCAN_SECRET` matches on both Flask and Django.
- [ ] `CORS_ALLOWED_ORIGINS` on Django includes the Vercel frontend URL.

---

## 7. Environment Variable Quick Reference

### Flask (Render)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Shared PostgreSQL URL |
| `MONIX_INTERNAL_SCAN_SECRET` | ✅ | Random hex secret |
| `PAGESPEED_API_KEY` | ✅ | Google API key |
| `DEBUG` | ✅ | `False` in production |
| `PORT` | Auto | Set by Render |

### Django (Render)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Same as Flask |
| `DJANGO_SECRET_KEY` | ✅ | Long random string |
| `DEBUG` | ✅ | `False` in production |
| `ALLOWED_HOSTS` | ✅ | Render hostname |
| `DJANGO_PUBLIC_BASE_URL` | ✅ | Full https URL of Django |
| `FLASK_API_URL` | ✅ | Full https URL of Flask |
| `MONIX_INTERNAL_SCAN_SECRET` | ✅ | Same as Flask |
| `CORS_ALLOWED_ORIGINS` | ✅ | Vercel URL |
| `GOOGLE_CLIENT_ID` | ✅ | OAuth credential |
| `GOOGLE_CLIENT_SECRET` | ✅ | OAuth credential |
| `GOOGLE_REDIRECT_URI` | ✅ | Must match Google Console |
| `GSC_OAUTH_SUCCESS_URL` | Recommended | Vercel redirect after GSC auth |
| `GSC_OAUTH_ERROR_URL` | Recommended | Vercel redirect on GSC failure |
| `AXES_FAILURE_LIMIT` | Optional | Default `5` |
| `AXES_COOLOFF_TIME` | Optional | Default `1` (hours) |
| `GOOGLE_REFRESH_TOKEN_FERNET_KEY` | Optional | Encrypt stored GSC tokens |

### Next.js (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Flask service URL |
| `NEXT_PUBLIC_DJANGO_URL` | ✅ | Django service URL |
