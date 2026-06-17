#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SYSTEMD_USER_DIR="$HOME/.config/systemd/user"

bash "$REPO_ROOT/systemd/render-prod-files.sh" "$REPO_ROOT"

mkdir -p "$SYSTEMD_USER_DIR"
cp "$REPO_ROOT/systemd/tmux-dashboard-backend.service"  "$SYSTEMD_USER_DIR/"
cp "$REPO_ROOT/systemd/tmux-dashboard-frontend.service" "$SYSTEMD_USER_DIR/"

systemctl --user daemon-reload
systemctl --user enable tmux-dashboard-backend.service tmux-dashboard-frontend.service

# Enable linger so user services start at boot without login
loginctl enable-linger "$USER"

echo ""
echo "Installed and enabled tmux-dashboard systemd user services."
echo "Start now:   systemctl --user start tmux-dashboard-backend tmux-dashboard-frontend"
echo "Check status: systemctl --user status tmux-dashboard-backend tmux-dashboard-frontend"
