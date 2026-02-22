#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-all}"

usage() {
  cat <<'EOF'
Usage: ./scripts/test.sh [all|backend|frontend]

all      Run backend pytest + frontend typecheck/build
backend  Run backend pytest only
frontend Run frontend typecheck/build only
EOF
}

run_backend() {
  echo "[test] backend: start"
  if [ ! -x "$REPO_ROOT/backend/venv/bin/pytest" ]; then
    echo "[test][error] backend pytest not found: backend/venv/bin/pytest" >&2
    echo "[test][hint] cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt" >&2
    exit 1
  fi
  (
    cd "$REPO_ROOT/backend"
    ./venv/bin/pytest -q
  )
  echo "[test] backend: ok"
}

run_frontend() {
  echo "[test] frontend: start"
  if [ ! -x "$REPO_ROOT/frontend/node_modules/.bin/next" ]; then
    echo "[test][error] frontend dependencies missing: frontend/node_modules/.bin/next" >&2
    echo "[test][hint] cd frontend && npm install" >&2
    exit 1
  fi
  (
    cd "$REPO_ROOT/frontend"
    npm run typecheck
    npm run build
  )
  echo "[test] frontend: ok"
}

case "$TARGET" in
  all)
    run_backend
    run_frontend
    ;;
  backend)
    run_backend
    ;;
  frontend)
    run_frontend
    ;;
  -h|--help)
    usage
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    usage
    exit 1
    ;;
esac
