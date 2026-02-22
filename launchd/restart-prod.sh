#!/bin/bash
set -euo pipefail

BACKEND_LABEL="jp.ontheroad.tmux-dashboard.backend.prod"
FRONTEND_LABEL="jp.ontheroad.tmux-dashboard.frontend.prod"
TUNNEL_LABEL="jp.ontheroad.tmux-dashboard.tunnel.prod"
TUNNEL_DEV_LABEL="jp.ontheroad.tmux-dashboard.tunnel.dev"
TARGET="${1:-all}"

kick_label() {
  local label="$1"
  launchctl kickstart -k "gui/$(id -u)/$label"
}

case "$TARGET" in
  all)
    kick_label "$BACKEND_LABEL"
    kick_label "$FRONTEND_LABEL"
    kick_label "$TUNNEL_LABEL"
    ;;
  frontend)
    kick_label "$FRONTEND_LABEL"
    ;;
  backend)
    kick_label "$BACKEND_LABEL"
    ;;
  tunnel)
    kick_label "$TUNNEL_LABEL"
    ;;
  tunnel-dev)
    kick_label "$TUNNEL_DEV_LABEL"
    ;;
  *)
    echo "Usage: $0 [all|frontend|backend|tunnel|tunnel-dev]" >&2
    exit 1
    ;;
esac

echo "Restarted: $TARGET"
