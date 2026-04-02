#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

load_env() {
  # Load backend env vars from repo-root .env for local dev.
  # This is intentionally simple: KEY=VALUE lines only.
  if [[ -f "$ROOT_DIR/.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
    set +a
  fi
}

usage() {
  cat <<'EOF'
Monix quickstart helper

Usage:
  ./setup.sh setup
  ./setup.sh dev
  ./setup.sh django
  ./setup.sh web
  ./setup.sh test
  ./setup.sh reset
  ./setup.sh reset-hard

Commands:
  setup       Create the Python venv, install backend deps, copy .env, and install web deps
  dev         Migrate, then run the Django dev server (API + admin)
  django      Run Django migrations, then start the Django dev server
  web         Run the Next.js frontend dev server
  test        Run the backend test suite from the repo root
  reset       Delete all users, targets, scans (keeps schema/migrations)
  reset-hard  Drop all tables then re-run migrations (full wipe + fresh schema)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ensure_venv() {
  if [[ ! -d "$VENV_DIR" ]]; then
    require_cmd python3
    python3 -m venv "$VENV_DIR"
  fi

  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
}

setup() {
  require_cmd python3
  require_cmd bun

  ensure_venv

  "$VENV_DIR/bin/python" -m pip install -r "$ROOT_DIR/requirements.txt"
  "$VENV_DIR/bin/python" -m pip install -e "$ROOT_DIR[dev]" 2>/dev/null || true

  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    echo "Created .env from .env.example"
  else
    echo ".env already exists, leaving it unchanged"
  fi

  (
    cd "$ROOT_DIR/web"
    bun install
  )

  cat <<'EOF'

Setup complete.

Next steps:
  ./setup.sh django    # backend (port 8000 by default)
  ./setup.sh web       # frontend in another terminal

Set NEXT_PUBLIC_DJANGO_URL in web/.env.local if the API is not on localhost:8000.
EOF
}

run_dev() {
  ensure_venv
  run_django
}

run_django() {
  ensure_venv
  load_env
  cd "$ROOT_DIR/core"
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL is required (PostgreSQL)." >&2
    echo "Set it in .env (for Supabase: use your project's Postgres connection string)." >&2
    exit 1
  fi
  python manage.py migrate
  echo "Ensuring Monix backend admin account is uniquely initialized for frontend React context..."
  echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('admin', 'admin@monix.com', 'admin') if not User.objects.exists() else None" | python manage.py shell
  python manage.py runserver
}

run_web() {
  require_cmd bun
  cd "$ROOT_DIR/web"
  bun run dev
}

run_tests() {
  ensure_venv
  cd "$ROOT_DIR"
  ./.venv/bin/pytest
}

run_reset() {
  ensure_venv
  python "$ROOT_DIR/reset_db.py"
}

run_reset_hard() {
  ensure_venv
  python "$ROOT_DIR/reset_db.py" --hard
  echo "Re-running migrations..."
  (
    cd "$ROOT_DIR/core"
    python manage.py migrate --noinput
  )
  echo "Done. Start the app with: ./setup.sh dev"
}

main() {
  local command="${1:-}"

  case "$command" in
    setup)
      setup
      ;;
    dev|django)
      run_django
      ;;
    api)
      echo "The Flask API has been merged into Django. Use: ./setup.sh django" >&2
      run_django
      ;;
    web)
      run_web
      ;;
    test)
      run_tests
      ;;
    reset)
      run_reset
      ;;
    reset-hard)
      run_reset_hard
      ;;
    -h|--help|"")
      usage
      ;;
    *)
      echo "Unknown command: $command" >&2
      echo >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
