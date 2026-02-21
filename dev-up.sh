#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

BACKEND_PORT="${DASHBOARD_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-4000}"

# Development defaults; override from shell when needed.
export DASHBOARD_AUTH_USER="${DASHBOARD_AUTH_USER:-admin}"
export DASHBOARD_AUTH_PASSWORD="${DASHBOARD_AUTH_PASSWORD:-admin}"
export BACKEND_API_BASE="${BACKEND_API_BASE:-http://127.0.0.1:${BACKEND_PORT}}"

if [ ! -x "$BACKEND_DIR/venv/bin/python" ]; then
  echo "backend venv is missing: $BACKEND_DIR/venv/bin/python" >&2
  echo "Run: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

if [ ! -x "$FRONTEND_DIR/node_modules/.bin/next" ]; then
  echo "frontend dependencies are missing: $FRONTEND_DIR/node_modules/.bin/next" >&2
  echo "Run: cd frontend && npm install" >&2
  exit 1
fi

check_port_free() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "port $port is already in use" >&2
      return 1
    fi
  fi
  return 0
}

check_port_free "$BACKEND_PORT"
check_port_free "$FRONTEND_PORT"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local ec=$?
  trap - INT TERM EXIT

  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" >/dev/null 2>&1; then
    kill "${FRONTEND_PID}" >/dev/null 2>&1 || true
  fi
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" >/dev/null 2>&1; then
    kill "${BACKEND_PID}" >/dev/null 2>&1 || true
  fi

  wait "${FRONTEND_PID}" >/dev/null 2>&1 || true
  wait "${BACKEND_PID}" >/dev/null 2>&1 || true
  exit "$ec"
}
trap cleanup INT TERM EXIT

(
  cd "$BACKEND_DIR"
  DASHBOARD_PORT="$BACKEND_PORT" ./venv/bin/python run.py
) &
BACKEND_PID=$!

(
  cd "$FRONTEND_DIR"
  ./node_modules/.bin/next dev -p "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo "backend: http://127.0.0.1:${BACKEND_PORT}"
echo "frontend: http://127.0.0.1:${FRONTEND_PORT}"

echo "Press Ctrl+C to stop both processes."

wait -n "$BACKEND_PID" "$FRONTEND_PID"
