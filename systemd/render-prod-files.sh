#!/bin/bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
TEMPLATES_DIR="$REPO_ROOT/systemd/templates"
OUT_DIR="$REPO_ROOT/systemd"

render() {
  local src="$1"
  local dst="$2"
  sed "s|__REPO_ROOT__|$REPO_ROOT|g" "$src" > "$dst"
}

render "$TEMPLATES_DIR/tmux-dashboard-backend.service.tmpl"  "$OUT_DIR/tmux-dashboard-backend.service"
render "$TEMPLATES_DIR/tmux-dashboard-frontend.service.tmpl" "$OUT_DIR/tmux-dashboard-frontend.service"
render "$TEMPLATES_DIR/start-frontend-prod.sh.tmpl"          "$OUT_DIR/start-frontend-prod.sh"

chmod +x "$OUT_DIR/start-frontend-prod.sh"

echo "Rendered systemd unit files with REPO_ROOT=$REPO_ROOT"
