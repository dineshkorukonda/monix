#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Monix quickstart helper (Next.js + Supabase only)

Usage:
  ./setup.sh setup
  ./setup.sh web
  ./setup.sh test
  ./setup.sh lint

Commands:
  setup   Copy .env.example to .env if missing, install web dependencies (Bun)
  web     Run the Next.js dev server (default http://localhost:3000)
  test    Run web unit tests (bun run test)
  lint    Run web linter (bun run lint)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

setup() {
  require_cmd bun

  if [[ ! -f "$ROOT_DIR/.env" ]]; then
    if [[ -f "$ROOT_DIR/.env.example" ]]; then
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
      echo "Created .env from .env.example — fill in Supabase and OAuth values."
    fi
  else
    echo ".env already exists, leaving it unchanged"
  fi

  (cd "$ROOT_DIR/web" && bun install)

  cat <<'EOF'

Setup complete.

Next: configure Supabase (see .env.example), apply supabase/migrations/*.sql to your project Postgres, then run:

  ./setup.sh web
EOF
}

run_web() {
  require_cmd bun
  cd "$ROOT_DIR/web"
  bun run dev
}

run_tests() {
  require_cmd bun
  cd "$ROOT_DIR/web"
  bun run test
}

run_lint() {
  require_cmd bun
  cd "$ROOT_DIR/web"
  bun run lint
}

main() {
  local command="${1:-}"

  case "$command" in
    setup)
      setup
      ;;
    web)
      run_web
      ;;
    test)
      run_tests
      ;;
    lint)
      run_lint
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
