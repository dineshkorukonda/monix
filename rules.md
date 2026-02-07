# Monix Development Rules

## Purpose
These rules ensure all LLMS contributors and tools maintain consistency, correctness, and security across the Monix project.

---

## Code Style
1. Follow idiomatic Python standards.
2. Use type hints for all public functions and methods.
3. Maintain PEP8 compliance.
4. Avoid unused imports, variables, and dead code.
5. Structure code around the existing architecture:
   - Data gathering in `engine/collector`
   - Analysis and scoring in `engine/analyzer`
   - UI rendering only in `dashboard/ui`

---

## Feature Additions
1. All new security logic must be added to `engine` modules.
2. UI should never implement logic, only display output.
3. Each feature must include:
   - Logs where applicable
   - Clear threat classification
   - Testing instructions

---

## Logging and Observability
1. Use `utils/logger` for all logging.
2. Log only actionable and meaningful security events.
3. Do not expose sensitive information (keys, credentials, internal paths).

---

## Performance Requirements
1. Dashboards must remain real-time and lightweight.
2. Avoid blocking I/O and expensive loops inside the display layer.
3. Log parsing should be restricted to the latest required entries.

---

## Security Principles
1. Never trust external input or remote data.
2. Threat scoring must be explainable and transparent.
3. No auto-blocking without human review unless discussed in advance.
4. IP addresses and activity must be processed with caution and accuracy.

---

## CLI and UX Guidelines
1. Output must be clean and minimal.
2. Focus on clarity for analysts and server administrators.
3. Avoid distractions and unnecessary visual elements.

---

## Contribution and Tooling Rules
1. Every change must include a module-level docstring summarizing its purpose.
2. Prefer modular enhancements rather than editing existing logic directly.
3. Follow the existing command design in `cli/commands`.

---

## Documentation
1. Every feature must update:
   - README or relevant documentation section
   - Inline documentation where appropriate
2. All security features must include a short technical rationale.

---

## Testing
1. New functions must include deterministic behavior that can be validated.
2. Do not rely on system-specific files without fallback behavior.
3. The dashboard must operate even with partial data collection failures.

---

## Version Control
1. Use descriptive commit messages.
2. Changes must be done in feature branches and reviewed before merging.
3. No temporary debug code in committed changes.
