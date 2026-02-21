#!/bin/bash
set -euo pipefail

BACKEND_LABEL="jp.ontheroad.tmux-dashboard.backend.prod"
FRONTEND_LABEL="jp.ontheroad.tmux-dashboard.frontend.prod"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_ROOT/launchd/logs"
SHOW_LOGS="${1:-}"

print_status() {
  local label="$1"
  local line
  line=$(launchctl list | awk -v l="$label" '$3==l {print $0}')
  if [ -n "$line" ]; then
    echo "$line"
  else
    echo "-\t-\t$label (not loaded)"
  fi
}

echo "== launchctl status =="
print_status "$BACKEND_LABEL"
print_status "$FRONTEND_LABEL"

if [ "$SHOW_LOGS" = "--logs" ]; then
  echo
  echo "== backend.prod.err.log (tail -n 40) =="
  tail -n 40 "$LOG_DIR/backend.prod.err.log" 2>/dev/null || echo "(no log)"
  echo
  echo "== frontend.prod.err.log (tail -n 40) =="
  tail -n 40 "$LOG_DIR/frontend.prod.err.log" 2>/dev/null || echo "(no log)"
fi
