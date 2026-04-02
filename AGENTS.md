## Cursor Cloud specific instructions

### Product overview

Monix is a web security, SEO, and performance analysis platform. Two services:
- **Django backend** (`core/`) — REST API + scan engine on port 8000
- **Next.js frontend** (`web/`) — dashboard UI on port 3000

### Prerequisites

- **PostgreSQL 16** must be running with database `monix` (see `DATABASE_URL` in `.env`)
- **Python 3.12** with venv at `.venv/`
- **Bun** (package manager for `web/`; `~/.bun/bin` must be on `PATH`)
- **Node.js 22.x** (required by Next.js)

### Running services

```bash
# Backend (terminal 1):
source .venv/bin/activate && source .env && cd core && python manage.py migrate && python manage.py runserver 0.0.0.0:8000

# Frontend (terminal 2):
cd web && bun run dev
```

The `setup.sh` script wraps these: `./setup.sh django` and `./setup.sh web`.

### Auth gotcha

`api_login` and `api_signup` are deprecated (return 410). For authenticated API testing, log into Django admin (`/admin/`, user `admin` / password `admin`), then reuse the session cookie. Alternatively, provide a Supabase Bearer JWT.

### Linting

- **Backend**: `black --check core/ tests/` and `flake8 core/ tests/` (pre-existing lint warnings exist in the repo)
- **Frontend**: `cd web && bun run lint` (runs Biome)

### Tests

Backend tests from repo root: `./.venv/bin/pytest` (requires `DATABASE_URL`).

### SSL errors in scans

The VM may lack a full CA bundle, causing `CERTIFICATE_VERIFY_FAILED` in HTTP-based collectors (SSL, tech fingerprinting, cookies, redirects). DNS, IP geo, and certificate metadata collectors still succeed. This does not indicate a code bug.
