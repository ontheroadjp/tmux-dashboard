#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_ENV_FILE="$BACKEND_DIR/.env.dev"
FRONTEND_ENV_FILE="$FRONTEND_DIR/.env.dev"

if [ ! -f "$BACKEND_ENV_FILE" ]; then
  echo "missing backend env file: $BACKEND_ENV_FILE" >&2
  echo "Run: cp backend/.env.dev.example backend/.env.dev" >&2
  exit 1
fi

if [ ! -f "$FRONTEND_ENV_FILE" ]; then
  echo "missing frontend env file: $FRONTEND_ENV_FILE" >&2
  echo "Run: cp frontend/.env.dev.example frontend/.env.dev" >&2
  exit 1
fi

set -a
source "$BACKEND_ENV_FILE"
source "$FRONTEND_ENV_FILE"
set +a

BACKEND_PORT="${DASHBOARD_PORT:-5001}"
FRONTEND_PORT="${FRONTEND_PORT:-4000}"
export DASHBOARD_ENV=dev
export DASHBOARD_ENV_FILE="$BACKEND_ENV_FILE"
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
  ./venv/bin/python run.py
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
