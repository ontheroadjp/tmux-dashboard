#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHOW_LOGS=0
FAILURES=0

usage() {
  cat <<'EOF'
Usage: ./scripts/doctor.sh [--logs]

Read-only diagnostics for tmux-dashboard.
- Does not edit files.
- Does not restart services.
- Does not change launchctl state.
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --logs)
      SHOW_LOGS=1
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

ok() { echo "[doctor][ok] $*"; }
warn() { echo "[doctor][warn] $*"; }
fail() { echo "[doctor][fail] $*"; FAILURES=$((FAILURES + 1)); }

check_command() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    ok "command found: $name"
  else
    fail "command missing: $name"
  fi
}

env_value() {
  local file="$1"
  local key="$2"
  awk -F= -v k="$key" '
    $0 !~ /^[[:space:]]*#/ && $1==k {
      sub(/^[^=]*=/, "", $0);
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", $0);
      print $0;
      exit
    }
  ' "$file"
}

check_env_file() {
  local file="$1"
  if [ -f "$file" ]; then
    ok "env exists: ${file#$REPO_ROOT/}"
  else
    fail "env missing: ${file#$REPO_ROOT/}"
  fi
}

check_env_required() {
  local file="$1"
  local key="$2"
  if [ ! -f "$file" ]; then
    fail "cannot validate $key (env missing: ${file#$REPO_ROOT/})"
    return
  fi
  local value
  value="$(env_value "$file" "$key" || true)"
  value="${value%\"}"
  value="${value#\"}"
  if [ -n "$value" ]; then
    ok "${file#$REPO_ROOT/}: $key is set"
  else
    fail "${file#$REPO_ROOT/}: $key is missing"
  fi
}

check_file() {
  local file="$1"
  if [ -f "$file" ]; then
    ok "file exists: ${file#$REPO_ROOT/}"
  else
    fail "file missing: ${file#$REPO_ROOT/}"
  fi
}

check_exec() {
  local file="$1"
  if [ -x "$file" ]; then
    ok "executable exists: ${file#$REPO_ROOT/}"
  else
    fail "executable missing: ${file#$REPO_ROOT/}"
  fi
}

check_port() {
  local port="$1"
  if ! command -v lsof >/dev/null 2>&1; then
    warn "lsof not found; skip port check for $port"
    return
  fi
  local line
  line="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -Fpcn 2>/dev/null | paste - - - 2>/dev/null | head -n 1 || true)"
  if [ -n "$line" ]; then
    ok "port $port listening ($line)"
  else
    warn "port $port is not listening"
  fi
}

print_launchctl_status() {
  local label="$1"
  if ! command -v launchctl >/dev/null 2>&1; then
    warn "launchctl not found; skip launch agent checks"
    return
  fi
  local line
  line="$(launchctl list 2>/dev/null | awk -v l="$label" '$3==l {print $0}' || true)"
  if [ -n "$line" ]; then
    ok "launchctl loaded: $line"
  else
    warn "launchctl not loaded: $label"
  fi
}

echo "== tmux-dashboard doctor =="
echo "repo: $REPO_ROOT"
echo

echo "== Command checks =="
check_command python3
check_command npm
check_command tmux
check_command launchctl
check_command autossh
echo

echo "== Env checks =="
check_env_file "$REPO_ROOT/backend/.env.dev"
check_env_file "$REPO_ROOT/backend/.env.prod"
check_env_file "$REPO_ROOT/frontend/.env.dev"
check_env_file "$REPO_ROOT/frontend/.env.prod"
check_env_file "$REPO_ROOT/tunnel/.env.dev"
check_env_file "$REPO_ROOT/tunnel/.env.prod"
check_env_required "$REPO_ROOT/backend/.env.prod" "DASHBOARD_AUTH_USER"
check_env_required "$REPO_ROOT/backend/.env.prod" "DASHBOARD_AUTH_PASSWORD"
check_env_required "$REPO_ROOT/backend/.env.prod" "DASHBOARD_AUTH_SECRET"
check_env_required "$REPO_ROOT/tunnel/.env.prod" "AUTOSSH_TARGET"
echo

echo "== Dependency checks =="
check_exec "$REPO_ROOT/backend/venv/bin/python"
check_exec "$REPO_ROOT/backend/venv/bin/gunicorn"
check_exec "$REPO_ROOT/frontend/node_modules/.bin/next"
echo

echo "== Build and generated files =="
check_file "$REPO_ROOT/frontend/.next/BUILD_ID"
check_exec "$REPO_ROOT/launchd/start-backend-prod.sh"
check_exec "$REPO_ROOT/launchd/start-frontend-prod.sh"
check_exec "$REPO_ROOT/launchd/start-tunnel-prod.sh"
check_exec "$REPO_ROOT/launchd/start-tunnel-dev.sh"
check_file "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist"
check_file "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist"
check_file "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist"
check_file "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist"
echo

echo "== launchctl checks =="
print_launchctl_status "jp.ontheroad.tmux-dashboard.backend.prod"
print_launchctl_status "jp.ontheroad.tmux-dashboard.frontend.prod"
print_launchctl_status "jp.ontheroad.tmux-dashboard.tunnel.prod"
print_launchctl_status "jp.ontheroad.tmux-dashboard.tunnel.dev"
echo

echo "== Port checks =="
check_port 5001
check_port 4000
check_port 10323
check_port 10322
echo

if [ "$SHOW_LOGS" -eq 1 ]; then
  LOG_DIR="$REPO_ROOT/launchd/logs"
  echo "== Recent error logs (tail -n 30) =="
  for log_name in backend.prod.err.log frontend.prod.err.log tunnel.prod.err.log tunnel.dev.err.log; do
    echo "-- $log_name --"
    tail -n 30 "$LOG_DIR/$log_name" 2>/dev/null || echo "(no log)"
    echo
  done
fi

if [ "$FAILURES" -eq 0 ]; then
  echo "[doctor] Result: OK (no hard failures)"
else
  echo "[doctor] Result: FAIL ($FAILURES issue(s))"
  exit 1
fi
