#!/bin/bash
set -euo pipefail

REPO_ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
TEMPLATES_DIR="$REPO_ROOT/launchd/templates"

render() {
  local src="$1"
  local dst="$2"
  sed "s|__REPO_ROOT__|$REPO_ROOT|g" "$src" > "$dst"
}

mkdir -p "$REPO_ROOT/launchd/logs"

render "$TEMPLATES_DIR/start-backend-prod.sh.tmpl" "$REPO_ROOT/launchd/start-backend-prod.sh"
render "$TEMPLATES_DIR/start-frontend-prod.sh.tmpl" "$REPO_ROOT/launchd/start-frontend-prod.sh"
render "$TEMPLATES_DIR/jp.ontheroad.tmux-dashboard.backend.prod.plist.tmpl" "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist"
render "$TEMPLATES_DIR/jp.ontheroad.tmux-dashboard.frontend.prod.plist.tmpl" "$REPO_ROOT/launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist"

chmod +x "$REPO_ROOT/launchd/start-backend-prod.sh" "$REPO_ROOT/launchd/start-frontend-prod.sh"

echo "Rendered production launchd files with REPO_ROOT=$REPO_ROOT"
