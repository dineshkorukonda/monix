#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$ROOT_DIR/.venv"

usage() {
  cat <<'EOF'
Monix quickstart helper

Usage:
  ./GET_STARTED.sh setup
  ./GET_STARTED.sh api
  ./GET_STARTED.sh django
  ./GET_STARTED.sh web
  ./GET_STARTED.sh test

Commands:
  setup   Create the Python venv, install backend deps, copy .env, and install web deps
  api     Run the Flask API from the repo root
  django  Run Django migrations, then start the Django dev server
  web     Run the Next.js frontend dev server
  test    Run the backend test suite from the repo root
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

  pip install -r "$ROOT_DIR/requirements.txt"
  pip install -e "$ROOT_DIR[dev]"

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
  ./GET_STARTED.sh api
  ./GET_STARTED.sh django
  ./GET_STARTED.sh web
EOF
}

run_api() {
  ensure_venv
  cd "$ROOT_DIR"
  python app.py
}

run_django() {
  ensure_venv
  cd "$ROOT_DIR/core"
  python manage.py migrate
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

main() {
  local command="${1:-}"

  case "$command" in
    setup)
      setup
      ;;
    api)
      run_api
      ;;
    django)
      run_django
      ;;
    web)
      run_web
      ;;
    test)
      run_tests
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
