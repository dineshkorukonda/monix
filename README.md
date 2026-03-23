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
```

## Admin Panel

The Django admin panel is available at `/admin/`. It lets administrators
inspect, filter, and bulk-manage scan records and reports without building
a custom dashboard.

### Creating a superuser

Run the following command inside the `core/` directory (where `manage.py`
lives) to create an admin account:

```bash
cd core
python manage.py createsuperuser
```

You will be prompted for a username, email address, and password. Once
created, log in at `http://localhost:8000/admin/` with those credentials.

### Admin features

- **Scan list** — columns: URL, score, created at, report ID  
  - Filter by score range (Safe / Low / Medium / High) and creation date  
  - Search by URL or report ID  
  - Bulk action: *Delete scans older than 30 days*

- **Report list** — columns: URL, expired status, expiry timestamp  
  - Filter by expired status and expiry date  
  - Search by URL  
  - Bulk action: *Mark selected reports as expired*
