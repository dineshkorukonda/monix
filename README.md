# Monix

Web security and performance analysis platform. Scan any public URL and get 
a comprehensive, shareable report covering security vulnerabilities, SEO 
health, and performance metrics — no login required.

Built for developers who want to audit their web properties before shipping.

## What It Does

Submit any public URL. Monix runs parallel checks across security, SEO, and 
performance, calculates an overall score, and generates a shareable report 
link that persists for 30 days.

## Checks

**Security**
- SSL/TLS certificate chain validation
- Security headers (HSTS, CSP, X-Frame-Options, referrer policy)
- DNS intelligence (A, AAAA, MX, NS, TXT records)
- Port survey (common service exposure)
- Technology detection (server, CMS, framework fingerprinting)
- Geo intelligence (IP location, provider mapping)

**SEO**
- Meta title and description (presence + length scoring)
- Open Graph tags (og:title, og:description, og:image)
- robots.txt and sitemap.xml presence
- Canonical tag and H1 tag validation

**Performance**
- Google Lighthouse score via PageSpeed Insights API
- Core Web Vitals (LCP, FID, CLS)
- Accessibility and best practices scores

## Stack

| Layer | Technology |
|---|---|
| Scan API | Python + Flask |
| Data & Admin | Django + Django ORM |
| Database | PostgreSQL |
| Frontend | Next.js (static export) |
| HTML Parsing | BeautifulSoup4 |
| Performance | Google PageSpeed Insights API |

## Admin Panel

The Django admin panel (`/admin/`) is protected by authentication. Only
superusers can access scan data and reports.

### Creating a superuser

```bash
cd core
python manage.py migrate          # apply all migrations (including axes)
python manage.py createsuperuser  # follow prompts for username / email / password
```

Then visit `http://localhost:8000/admin/` and log in with those credentials.

### Login rate limiting

The admin login page is protected by
[django-axes](https://django-axes.readthedocs.io/). After **5** consecutive
failed login attempts from the same IP address that IP address is locked out for
**1 hour**. Both limits are configurable via environment variables:

| Variable | Default | Description |
|---|---|---|
| `AXES_FAILURE_LIMIT` | `5` | Failed attempts before lockout |
| `AXES_COOLOFF_TIME` | `1` | Lockout duration in hours |

### Environment variables

Copy `.env.example` to `.env` and fill in the values.  The most important
variable for production deployments is `DJANGO_SECRET_KEY` — generate a fresh
one with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Architecture
```
Next.js frontend
      ↓               ↓
POST /api/scan    GET /api/reports/:id
      ↓               ↓
 Flask API        Django API
(scan engine)   (reports + admin)
      ↓               ↓
      └──── PostgreSQL ────┘
