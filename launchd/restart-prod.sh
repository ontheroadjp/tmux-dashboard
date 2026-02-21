#!/bin/bash
set -euo pipefail

BACKEND_LABEL="jp.ontheroad.tmux-dashboard.backend.prod"
FRONTEND_LABEL="jp.ontheroad.tmux-dashboard.frontend.prod"
TARGET="${1:-all}"

kick_label() {
  local label="$1"
  launchctl kickstart -k "gui/$(id -u)/$label"
}

case "$TARGET" in
  all)
    kick_label "$BACKEND_LABEL"
    kick_label "$FRONTEND_LABEL"
    ;;
  frontend)
    kick_label "$FRONTEND_LABEL"
    ;;
  backend)
    kick_label "$BACKEND_LABEL"
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend]" >&2
    exit 1
    ;;
esac

echo "Restarted: $TARGET"
