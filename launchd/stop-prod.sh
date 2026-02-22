#!/bin/bash
set -euo pipefail

BACKEND_LABEL="jp.ontheroad.tmux-dashboard.backend.prod"
FRONTEND_LABEL="jp.ontheroad.tmux-dashboard.frontend.prod"
TUNNEL_LABEL="jp.ontheroad.tmux-dashboard.tunnel.prod"
TUNNEL_DEV_LABEL="jp.ontheroad.tmux-dashboard.tunnel.dev"
TARGET="${1:-all}"

stop_label() {
  local label="$1"
  launchctl bootout "gui/$(id -u)/$label" >/dev/null 2>&1 || \
    launchctl remove "$label" >/dev/null 2>&1 || true
}

case "$TARGET" in
  all)
    stop_label "$TUNNEL_LABEL"
    stop_label "$FRONTEND_LABEL"
    stop_label "$BACKEND_LABEL"
    ;;
  frontend)
    stop_label "$FRONTEND_LABEL"
    ;;
  backend)
    stop_label "$BACKEND_LABEL"
    ;;
  tunnel)
    stop_label "$TUNNEL_LABEL"
    ;;
  tunnel-dev)
    stop_label "$TUNNEL_DEV_LABEL"
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend|tunnel|tunnel-dev]" >&2
    exit 1
    ;;
esac

echo "Stopped: $TARGET"
