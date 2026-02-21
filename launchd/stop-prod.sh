#!/bin/bash
set -euo pipefail

BACKEND_LABEL="jp.ontheroad.tmux-dashboard.backend.prod"
FRONTEND_LABEL="jp.ontheroad.tmux-dashboard.frontend.prod"
TARGET="${1:-all}"

stop_label() {
  local label="$1"
  launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || \
    launchctl remove "$label" >/dev/null 2>&1 || true
}

case "$TARGET" in
  all)
    stop_label "$FRONTEND_LABEL"
    stop_label "$BACKEND_LABEL"
    ;;
  frontend)
    stop_label "$FRONTEND_LABEL"
    ;;
  backend)
    stop_label "$BACKEND_LABEL"
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend]" >&2
    exit 1
    ;;
esac

echo "Stopped: $TARGET"
