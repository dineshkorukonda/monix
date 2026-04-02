# Monix

Monix is a web security, SEO, and performance analysis platform. It scans a
public URL, calculates category scores plus an overall score, and stores a
shareable report for later retrieval.

## Project Layout


| Path                | Role                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `core/scan_engine/` | Analyzers, collectors, monitoring, SEO/PageSpeed scoring           |
| `core/reports/`     | Django app (REST API, auth, GSC, persistence)                      |
| `core/config/`      | Django project settings (`DJANGO_SETTINGS_MODULE=config.settings`) |
| `web/`              | Next.js frontend (Bun + Next 16)                                   |
| `tests/`            | Backend pytest suite (Django + scan engine); see `tests/README.md` |


## What Monix Checks

### Security

- SSL/TLS certificate validity
- Security header coverage
- DNS and host intelligence
- Port exposure checks
- Technology fingerprinting
- Geo and IP enrichment

### SEO

- Meta title and description quality
- Open Graph tags
- `robots.txt` and `sitemap.xml`
- Canonical and H1 validation

### Performance

- Google PageSpeed Insights results
- Core Web Vitals
- Accessibility and best-practices scores

## Architecture

```text
Next.js frontend
      |
      v
Django (`core/` — REST API + scan engine)
      |
      v
PostgreSQL
```

## Local Setup

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ".[dev]"
cp .env.example .env
cd core && python manage.py migrate && python manage.py runserver
```

### Django Admin

```bash
cd core
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The admin panel is available at `http://localhost:8000/admin/`.

### Frontend

```bash
cd web
bun install
bun run dev
```

Dependency lockfile for the frontend is `web/bun.lock` (Bun). Do not add `package-lock.json`.

Point the web app at Django (default `http://localhost:8000`) via `NEXT_PUBLIC_DJANGO_URL`.
Supabase Auth requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `web/.env.local`.

## Environment Notes

- `DATABASE_URL` is **required** and connects Django to PostgreSQL (local or Supabase).
- `DJANGO_SECRET_KEY` should be set for local and production Django usage.
- `PAGESPEED_API_KEY` enables live PageSpeed Insights data.

Generate a Django secret key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Admin Security

The Django admin login is rate-limited with
[django-axes](https://django-axes.readthedocs.io/).


| Variable             | Default | Description                    |
| -------------------- | ------- | ------------------------------ |
| `AXES_FAILURE_LIMIT` | `5`     | Failed attempts before lockout |
| `AXES_COOLOFF_TIME`  | `1`     | Lockout duration in hours      |


## Testing

Backend tests live under `tests/` and target `scan_engine` and `reports` (pytest-django, PostgreSQL not required for most tests). From the repo root with the venv active:

```bash
# Fast feedback (default; no coverage)
pytest

# Same as CI: coverage for scan_engine + reports
pytest --cov=scan_engine --cov=reports --cov-report=term-missing
```

CI (GitHub Actions): **Frontend** — `bun install` and `next build` in `web/`. **Backend** — Python 3.11, Postgres 16 service, pytest with coverage. Pushes and pull requests to `main` share one concurrent run per branch (new commits cancel superseded runs).