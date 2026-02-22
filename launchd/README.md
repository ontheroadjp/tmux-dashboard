# launchd setup (production only)

This directory contains production LaunchAgent files and startup scripts for macOS `launchd`.

## 1. Render local files from templates

```bash
cd <REPO_ROOT>
./launchd/render-prod-files.sh
```

Templates committed to Git:

- `launchd/templates/start-backend-prod.sh.tmpl`
- `launchd/templates/start-frontend-prod.sh.tmpl`
- `launchd/templates/start-tunnel-prod.sh.tmpl`
- `launchd/templates/start-tunnel-dev.sh.tmpl`
- `launchd/templates/jp.ontheroad.tmux-dashboard.backend.prod.plist.tmpl`
- `launchd/templates/jp.ontheroad.tmux-dashboard.frontend.prod.plist.tmpl`
- `launchd/templates/jp.ontheroad.tmux-dashboard.tunnel.prod.plist.tmpl`
- `launchd/templates/jp.ontheroad.tmux-dashboard.tunnel.dev.plist.tmpl`

Generated local runtime files (gitignored):

- `launchd/start-backend-prod.sh`
- `launchd/start-frontend-prod.sh`
- `launchd/start-tunnel-prod.sh`
- `launchd/start-tunnel-dev.sh`
- `launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist`

## 2. Install autossh (required for tunnel)

```bash
brew install autossh
```

## 3. Build frontend

```bash
cd <REPO_ROOT>/frontend
npm run build
```

## 4. Install backend dependencies

```bash
cd <REPO_ROOT>/backend
./venv/bin/pip install -r requirements.txt
```

## 5. Prepare env files

```bash
cd <REPO_ROOT>
cp backend/.env.prod.example backend/.env.prod
cp frontend/.env.prod.example frontend/.env.prod
cp tunnel/.env.prod.example tunnel/.env.prod
chmod 600 backend/.env.prod
chmod 600 tunnel/.env.prod
```

`backend/.env.prod` required:

- `DASHBOARD_AUTH_USER`
- `DASHBOARD_AUTH_PASSWORD`
- `DASHBOARD_AUTH_SECRET`

`tunnel/.env.prod` required:

- `AUTOSSH_TARGET` (example: `nobita` or `user@vps-host`)

`tunnel/.env.prod` optional:

- `AUTOSSH_REMOTE_PORT` (default: `10322`)
- `AUTOSSH_LOCAL_HOST` (default: `127.0.0.1`)
- `AUTOSSH_LOCAL_PORT` (default: `10322`)
- `AUTOSSH_SERVER_ALIVE_INTERVAL` (default: `30`)
- `AUTOSSH_SERVER_ALIVE_COUNT_MAX` (default: `3`)

`tunnel/.env.dev` (optional for dev tunnel):

- Recommended: `AUTOSSH_REMOTE_PORT=10422`, `AUTOSSH_LOCAL_PORT=4000`

Create only when needed:

```bash
cp tunnel/.env.dev.example tunnel/.env.dev
chmod 600 tunnel/.env.dev
```

## 6. Install Production LaunchAgents

```bash
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist ~/Library/LaunchAgents/
# optional: only when you need external access to dev frontend
# cp launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist ~/Library/LaunchAgents/
```

## 7. Load and start

```bash
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist 2>/dev/null || true
# launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist
# load only when you need external access to dev frontend
# launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist
```

## 8. Check status

```bash
launchctl list | rg tmux-dashboard
```

Production logs:

- `<REPO_ROOT>/launchd/logs/backend.prod.out.log`
- `<REPO_ROOT>/launchd/logs/backend.prod.err.log`
- `<REPO_ROOT>/launchd/logs/frontend.prod.out.log`
- `<REPO_ROOT>/launchd/logs/frontend.prod.err.log`
- `<REPO_ROOT>/launchd/logs/tunnel.prod.out.log`
- `<REPO_ROOT>/launchd/logs/tunnel.prod.err.log`
- `<REPO_ROOT>/launchd/logs/tunnel.dev.out.log`
- `<REPO_ROOT>/launchd/logs/tunnel.dev.err.log`

## 9. Status

```bash
./launchd/status-prod.sh
./launchd/status-prod.sh --logs
```

## 10. Restart (recommended)


```bash
./launchd/restart-prod.sh all
./launchd/restart-prod.sh frontend
./launchd/restart-prod.sh backend
./launchd/restart-prod.sh tunnel
./launchd/restart-prod.sh tunnel-dev
```

## 11. Stop

```bash
./launchd/stop-prod.sh all
./launchd/stop-prod.sh frontend
./launchd/stop-prod.sh backend
./launchd/stop-prod.sh tunnel
./launchd/stop-prod.sh tunnel-dev
```
