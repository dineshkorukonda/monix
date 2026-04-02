# Backend tests

Pytest configuration is in the repo root `pyproject.toml` (`DJANGO_SETTINGS_MODULE=config.settings`, `pythonpath` includes `core/`). `conftest.py` disables background scan monitor noise and sets test JWT env for Supabase verification.

## What each module covers


| File                          | Focus                                               |
| ----------------------------- | --------------------------------------------------- |
| `test_analyzers_*.py`         | Traffic and threat analyzers                        |
| `test_api_server.py`          | API / server behavior                               |
| `test_cloudflare.py`          | Cloudflare-related checks                           |
| `test_collectors_*.py`        | System and connection collectors                    |
| `test_db.py`                  | Database-related behavior                           |
| `test_django_auth.py`         | Auth, JWT, Supabase integration paths               |
| `test_django_models.py`       | Django models                                       |
| `test_django_views.py`        | Report and API views                                |
| `test_gsc.py`                 | Google Search Console                               |
| `test_monitoring_*.py`        | Monitoring engine and state                         |
| `test_performance_checker.py` | Performance / PageSpeed-style scoring               |
| `test_scanners_*.py`          | Web and security scanners                           |
| `test_scoring.py`             | `scan_engine.scoring` (category and overall scores) |
| `test_seo_checker.py`         | SEO checker module                                  |


## Quantity and quality

The suite favors **contracts and regressions**: auth and report APIs, scoring weights, SEO/PageSpeed pipelines, and Django persistence. Prefer **parametrized** or **merged** cases over many copy-pasted tests; add focused tests when a bug proves a gap.

## Commands

```bash
pytest                              # default: quiet, short tracebacks, no coverage
pytest --cov=scan_engine --cov=reports --cov-report=term-missing
pytest tests/test_scoring.py        # single file
pytest tests/test_scoring.py::TestCalculateSecurityScore::test_all_pass_gives_100
```

