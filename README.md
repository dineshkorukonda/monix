# Monix

Monix is a web security, SEO, and performance analysis platform. It scans a
public URL, calculates category scores plus an overall score, and stores a
shareable report for later retrieval.

## Project Layout

- `api/` Flask scan API and analysis engine
- `core/` Django project for reports and admin
- `web/` Next.js frontend
- `tests/` centralized backend test suite
- `GET_STARTED.sh` fastest local setup path

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
Flask API (`api/`)
      |
      +--> scan results + scoring
      |
      v
PostgreSQL
      ^
      |
Django reports/admin (`core/`)
```

## Local Setup

Detailed quickstart steps live in `GET_STARTED.sh`.

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ".[dev]"
cp .env.example .env
python app.py
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

## Environment Notes

- `DATABASE_URL` connects Flask and Django to the same PostgreSQL database.
- `DJANGO_SECRET_KEY` should be set for local and production Django usage.
- `PAGESPEED_API_KEY` enables live PageSpeed Insights data.

Generate a Django secret key with:

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Admin Security

The Django admin login is rate-limited with
[django-axes](https://django-axes.readthedocs.io/).

| Variable | Default | Description |
|---|---|---|
| `AXES_FAILURE_LIMIT` | `5` | Failed attempts before lockout |
| `AXES_COOLOFF_TIME` | `1` | Lockout duration in hours |

## Testing

Run the backend suite with coverage from the repo root:

```bash
./.venv/bin/pytest
```

CI also builds the frontend with Bun and runs the backend suite on Python 3.11.
