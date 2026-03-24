# Monix Agent Guide

## Purpose

This file is the working guide for coding agents and contributors operating in
the Monix repository. Monix spans three application surfaces:

- `api/`: Flask-based scan and scoring API
- `core/`: Django reports and admin application
- `web/`: Next.js frontend

Changes should preserve that separation of concerns and keep the end-to-end
scan flow reliable.

## Repo Map

- `api/` contains scan orchestration, scoring, and persistence entrypoints for
  the Flask service.
- `core/reports/` contains Django models, views, admin config, and report
  management logic.
- `core/config/` contains Django project configuration.
- `web/src/` contains the Next.js application, UI components, and frontend API
  bindings.
- `tests/` contains backend tests run from the repository root.
- `utils/` contains shared Python helpers used across backend code.
- `GET_STARTED.sh` is the quickest entrypoint for local setup and common dev
  commands.

## Working Principles

1. Keep security scanning, enrichment, and scoring logic in `api/`, not in the
   frontend or Django views.
2. Keep Django report retrieval, admin actions, and expiry management in
   `core/reports/`.
3. Keep presentation and client-side UX concerns in `web/src/`.
4. Prefer focused changes over cross-cutting refactors unless the task clearly
   requires one.
5. When touching a file, clean up nearby dead code, stale imports, and obvious
   inconsistencies.

## Code Expectations

### Python

- Follow idiomatic Python with clear function boundaries.
- Add type hints for public functions where practical.
- Fail gracefully around network, DNS, database, and third-party API errors.
- Keep scan output explainable; avoid opaque score changes without traceable
  logic.

### TypeScript / Next.js

- Keep API types close to the frontend API client when possible.
- Prefer reusable UI primitives over duplicating styling patterns.
- Respect App Router constraints, including `Suspense` requirements for client
  hooks such as `useSearchParams`.
- Keep production build and lint compatibility in mind while editing.

## Reliability and Security

1. Never trust remote input or third-party responses.
2. Do not leak secrets, credentials, or internal-only configuration in user
   responses.
3. Handle partial subsystem failure cleanly; Monix should degrade rather than
   crash when possible.
4. Preserve deterministic behavior in scoring and report retrieval.

## Testing and Verification

1. Add or update tests for behavior changes when backend behavior changes.
2. Prefer deterministic tests and isolate network/system dependencies with mocks
   where practical.
3. For frontend work, verify at minimum:
   - `bun run lint`
   - `bun run build`
4. For backend work, run the relevant `pytest` coverage from the repo root when
   feasible.

## Documentation

1. Update `README.md` or `GET_STARTED.sh` when setup or workflow changes.
2. Keep this guide aligned with the actual repo layout and toolchain.
3. Add concise docstrings or comments where they materially improve clarity.

## Agent Notes

1. Check for existing local changes before editing and avoid overwriting user
   work.
2. Prefer non-destructive commands.
3. If a dependency or toolchain issue blocks verification, fix it when it is in
   repo scope; otherwise report the exact blocker clearly.
