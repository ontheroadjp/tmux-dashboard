# tmux-dashboard

tmux セッションの状態確認と操作を行うダッシュボードです。  
構成は `backend (Flask)` + `frontend (Next.js)` です。

## Minimum Usage (Development)

最小手順だけで開発起動する場合:

```bash
# 1) dependencies
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

cd ../frontend
npm install

# 2) env files
cd ..
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev

# 3) start both servers
./dev-up.sh
```

- Frontend (dev): `http://127.0.0.1:4000`
- Backend (dev): `http://127.0.0.1:5001`

## Minimum Usage (Production with launchd)

最小構成で本番常駐する場合:

```bash
# 1) dependencies + build
cd backend
./venv/bin/pip install -r requirements.txt

cd ../frontend
npm install
npm run build

# 2) env files
cd ..
cp backend/.env.prod.example backend/.env.prod
cp frontend/.env.prod.example frontend/.env.prod
cp tunnel/.env.prod.example tunnel/.env.prod

# edit required values
# - backend/.env.prod: DASHBOARD_AUTH_USER / DASHBOARD_AUTH_PASSWORD / DASHBOARD_AUTH_SECRET
# - tunnel/.env.prod: AUTOSSH_TARGET

# 3) render launchd runtime files
./launchd/render-prod-files.sh

# 4) install/load launch agents (macOS launchd)
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist ~/Library/LaunchAgents/

launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist
```

- Frontend (prod): `http://127.0.0.1:10322`
- Backend (prod): `http://127.0.0.1:10323`

運用確認:

```bash
./launchd/status-prod.sh
./launchd/status-prod.sh --logs
```

## Dev External Publish (Optional)

dev 確認を外部端末から行う場合のみ:

```bash
cp tunnel/.env.dev.example tunnel/.env.dev
# edit tunnel/.env.dev (AUTOSSH_TARGET など)

./launchd/render-prod-files.sh
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist
```

## Env Files

- 実体ファイル（ローカル用・Git ignore）
  - `backend/.env.dev`
  - `backend/.env.prod`
  - `frontend/.env.dev`
  - `frontend/.env.prod`
  - `tunnel/.env.dev`
  - `tunnel/.env.prod`
- テンプレート（Git追跡）
  - `backend/.env.dev.example`
  - `backend/.env.prod.example`
  - `frontend/.env.dev.example`
  - `frontend/.env.prod.example`
  - `tunnel/.env.dev.example`
  - `tunnel/.env.prod.example`

## Operations

- 本番再起動: `./launchd/restart-prod.sh all`
- 本番停止: `./launchd/stop-prod.sh all`
- 個別制御:
  - `./launchd/restart-prod.sh backend`
  - `./launchd/restart-prod.sh frontend`
  - `./launchd/restart-prod.sh tunnel`
  - `./launchd/restart-prod.sh tunnel-dev`

## Documentation

- Runbook index: `docs/manual/runbook.md`
- Development: `docs/manual/development.md`
- Production launchd: `docs/manual/production-launchd.md`
- Tunnel + Nginx: `docs/manual/tunnel-and-nginx.md`
- mTLS guide: `docs/manual/mtls-guide.md`
- CRL operation: `docs/manual/crl-guide.md`
