#!/bin/bash
# Check whether tmux is synchronized with the current desktop session manager.
#
# Run this read-only diagnostic inside a tmux pane after logging in to GNOME.
# It compares SESSION_MANAGER in the current shell, the containing tmux session,
# and the systemd user environment. This catches a persistent tmux server that
# still references an ICE socket from a previous desktop login.
#
# Usage: ./scripts/check-session-manager.sh
# Exit 0: all three values are present and equal.
# Exit 1: a prerequisite/value is missing or the values do not match.
set -euo pipefail

log() { echo "[session-manager] $*"; }
fail() {
  echo "[session-manager][fail] $*" >&2
  exit 1
}

if [ -z "${TMUX:-}" ] || [ -z "${TMUX_PANE:-}" ]; then
  fail "run this script inside tmux"
fi

if ! command -v systemctl >/dev/null 2>&1; then
  fail "systemctl not found"
fi

shell_value="${SESSION_MANAGER:-}"
tmux_value="$({ tmux show-environment -t "$TMUX_PANE" SESSION_MANAGER 2>/dev/null || true; } | sed -n 's/^SESSION_MANAGER=//p')"
systemd_value="$(systemctl --user show-environment | sed -n 's/^SESSION_MANAGER=//p')"

if [ -z "$shell_value" ] || [ -z "$tmux_value" ] || [ -z "$systemd_value" ]; then
  log "shell:        ${shell_value:-<missing>}"
  log "tmux:         ${tmux_value:-<missing>}"
  log "systemd user: ${systemd_value:-<missing>}"
  fail "SESSION_MANAGER is missing"
fi

if [ "$shell_value" != "$tmux_value" ] || [ "$tmux_value" != "$systemd_value" ]; then
  log "shell:        $shell_value"
  log "tmux:         $tmux_value"
  log "systemd user: $systemd_value"
  fail "SESSION_MANAGER is not synchronized"
fi

log "OK: shell, tmux, and systemd user SESSION_MANAGER values are all equal"
