#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DO_BUILD=0
DO_INSTALL_DEPS=1

usage() {
  cat <<'EOF'
Usage: ./scripts/bootstrap.sh [options]

Safe bootstrap for this repository.
- Never overwrites existing .env files.
- Never starts/stops/reloads running services.

Options:
  --build          Run frontend production build.
  --skip-install   Skip dependency installation checks.
  -h, --help       Show this help.
EOF
}

log() { echo "[bootstrap] $*"; }
warn() { echo "[bootstrap][warn] $*" >&2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --build)
      DO_BUILD=1
      shift
      ;;
    --skip-install)
      DO_INSTALL_DEPS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  warn "python3 not found"
fi
if ! command -v npm >/dev/null 2>&1; then
  warn "npm not found"
fi
if ! command -v tmux >/dev/null 2>&1; then
  warn "tmux not found"
fi

ensure_env_file() {
  local target="$1"
  local example="$2"
  if [ -f "$target" ]; then
    log "Keep existing env: ${target#$REPO_ROOT/}"
    return 0
  fi
  if [ ! -f "$example" ]; then
    warn "Missing template: ${example#$REPO_ROOT/}"
    return 1
  fi
  cp "$example" "$target"
  log "Created env from template: ${target#$REPO_ROOT/}"
}

ensure_env_file "$REPO_ROOT/backend/.env.dev" "$REPO_ROOT/backend/.env.dev.example"
ensure_env_file "$REPO_ROOT/backend/.env.prod" "$REPO_ROOT/backend/.env.prod.example"
ensure_env_file "$REPO_ROOT/frontend/.env.dev" "$REPO_ROOT/frontend/.env.dev.example"
ensure_env_file "$REPO_ROOT/frontend/.env.prod" "$REPO_ROOT/frontend/.env.prod.example"
ensure_env_file "$REPO_ROOT/tunnel/.env.dev" "$REPO_ROOT/tunnel/.env.dev.example"
ensure_env_file "$REPO_ROOT/tunnel/.env.prod" "$REPO_ROOT/tunnel/.env.prod.example"

chmod 600 "$REPO_ROOT/backend/.env.prod" "$REPO_ROOT/tunnel/.env.prod" 2>/dev/null || true

if [ "$DO_INSTALL_DEPS" -eq 1 ]; then
  if [ ! -x "$REPO_ROOT/backend/venv/bin/python" ]; then
    if command -v python3 >/dev/null 2>&1; then
      log "Create backend venv"
      (cd "$REPO_ROOT/backend" && python3 -m venv venv)
    else
      warn "Skip backend venv creation (python3 not found)"
    fi
  fi

  if [ -x "$REPO_ROOT/backend/venv/bin/pip" ]; then
    log "Install backend dependencies"
    (cd "$REPO_ROOT/backend" && ./venv/bin/pip install -r requirements.txt)
  else
    warn "Skip backend dependencies (backend/venv/bin/pip not found)"
  fi

  if [ ! -x "$REPO_ROOT/frontend/node_modules/.bin/next" ]; then
    if command -v npm >/dev/null 2>&1; then
      log "Install frontend dependencies"
      (cd "$REPO_ROOT/frontend" && npm install)
    else
      warn "Skip frontend dependencies (npm not found)"
    fi
  else
    log "Keep existing frontend dependencies"
  fi
else
  log "Skip dependency installation (--skip-install)"
fi

log "Render launchd runtime files"
"$REPO_ROOT/launchd/render-prod-files.sh" "$REPO_ROOT"

if [ "$DO_BUILD" -eq 1 ]; then
  if command -v npm >/dev/null 2>&1; then
    log "Build frontend production artifacts"
    (cd "$REPO_ROOT/frontend" && npm run build)
  else
    warn "Skip build (npm not found)"
  fi
else
  log "Skip frontend build (use --build when needed)"
fi

cat <<EOF
[bootstrap] Done.
Next steps:
  1) Review and edit: backend/.env.prod, frontend/.env.prod, tunnel/.env.prod
  2) Optional build: ./scripts/bootstrap.sh --build
  3) Diagnose status: ./scripts/doctor.sh
EOF
