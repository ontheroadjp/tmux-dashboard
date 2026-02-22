# Refactor Todo

- [x] Add safety-net tests for route helper behavior (client IP trust boundary)
- [x] Commit safety net (`[/refactor:wip] Safety net added`)
- [x] Extract route helpers from `register_routes` without behavior change
- [x] Run backend tests
- [x] Run frontend typecheck/build for regression confidence
- [x] Commit refactor change
- [x] Commit regression verification (`[/refactor] Regression verified`)

## Review

- backend tests: `cd backend && ./venv/bin/pytest -q` -> `23 passed`
- frontend checks: `cd frontend && npm run typecheck && npm run build` -> success
- behavior: no API route/path/status contract changes introduced
