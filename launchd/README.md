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
- `launchd/templates/jp.ontheroad.tmux-dashboard.backend.prod.plist.tmpl`
- `launchd/templates/jp.ontheroad.tmux-dashboard.frontend.prod.plist.tmpl`

Generated local runtime files (gitignored):

- `launchd/start-backend-prod.sh`
- `launchd/start-frontend-prod.sh`
- `launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist`

## 2. Build frontend

```bash
cd <REPO_ROOT>/frontend
npm run build
```

## 3. Install backend dependencies

```bash
cd <REPO_ROOT>/backend
./venv/bin/pip install -r requirements.txt
```

## 4. Prepare env files

```bash
cd <REPO_ROOT>
cp launchd/backend.prod.env.example launchd/backend.prod.env
cp launchd/frontend.prod.env.example launchd/frontend.prod.env
chmod 600 launchd/backend.prod.env
```

`launchd/backend.prod.env` required:

- `DASHBOARD_AUTH_USER`
- `DASHBOARD_AUTH_PASSWORD`
- `DASHBOARD_AUTH_SECRET`

## 5. Install Production LaunchAgents

```bash
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
```

## 6. Load and start

```bash
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
```

## 7. Check status

```bash
launchctl list | rg tmux-dashboard
```

Production logs:

- `<REPO_ROOT>/launchd/logs/backend.prod.out.log`
- `<REPO_ROOT>/launchd/logs/backend.prod.err.log`
- `<REPO_ROOT>/launchd/logs/frontend.prod.out.log`
- `<REPO_ROOT>/launchd/logs/frontend.prod.err.log`

## 8. Status

```bash
./launchd/status-prod.sh
./launchd/status-prod.sh --logs
```

## 9. Restart (recommended)


```bash
./launchd/restart-prod.sh all
./launchd/restart-prod.sh frontend
./launchd/restart-prod.sh backend
```

## 10. Stop

```bash
./launchd/stop-prod.sh all
./launchd/stop-prod.sh frontend
./launchd/stop-prod.sh backend
```
