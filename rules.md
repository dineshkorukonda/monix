# Monix Development Rules

## Purpose

These rules keep the Monix codebase consistent across the Flask API, Django
reports/admin project, and Next.js frontend.

## Project Structure

1. Put scan, enrichment, and scoring logic in `api/`.
2. Keep Django report and admin code in `core/reports/`.
3. Keep Django project configuration in `core/config/`.
4. Keep frontend UI code in `web/src/`.
5. Keep shared Python helpers in `utils/`.
6. Keep backend tests in `tests/`.

## Code Standards

1. Follow idiomatic Python and TypeScript style.
2. Use type hints for public Python functions where practical.
3. Remove unused imports, dead code, and stale config when touching a module.
4. Prefer small, focused modules over adding unrelated logic to large files.
5. Keep user-facing behavior resilient when external services fail.

## Security and Reliability

1. Never trust remote input or third-party responses.
2. Handle network, DNS, and system-inspection failures gracefully.
3. Do not expose secrets, credentials, or internal-only details in responses.
4. Threat scoring and security output should stay explainable.

## Documentation

1. Update `README.md` or `GET_STARTED.txt` when setup or structure changes.
2. Keep this rules file aligned with the actual repo layout.
3. Add concise module docstrings where they help explain purpose.

## Testing

1. Add or update tests for behavior changes.
2. Prefer deterministic tests with mocks around network and system calls.
3. The backend should continue working with partial subsystem failures.
