# Production Launchd Manual

## 目的
- 本番モード (`frontend:10322`, `backend:10323`) を `launchd` で常駐運用する。

## 前提
- 実行場所: `<REPO_ROOT>`
- 本番バックエンド: `127.0.0.1:10323`
- 本番フロントエンド: `127.0.0.1:10322`
- 本番 SSH reverse tunnel: `remote:10322 -> local:127.0.0.1:10322`

## 1. テンプレートから本番ファイルを生成

```bash
cd <REPO_ROOT>
./launchd/render-prod-files.sh
```

生成されるローカルファイル（gitignored）:
- `launchd/start-backend-prod.sh`
- `launchd/start-frontend-prod.sh`
- `launchd/start-tunnel-prod.sh`
- `launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist`

## 2. 事前ビルド

```bash
cd <REPO_ROOT>/backend
./venv/bin/pip install -r requirements.txt

cd <REPO_ROOT>/frontend
npm run build
```

## 3. 本番 env の作成

```bash
cd <REPO_ROOT>
cp backend/.env.prod.example backend/.env.prod
cp frontend/.env.prod.example frontend/.env.prod
cp tunnel/.env.prod.example tunnel/.env.prod
chmod 600 backend/.env.prod
chmod 600 tunnel/.env.prod
```

`backend/.env.prod` 必須:
- `DASHBOARD_AUTH_USER`
- `DASHBOARD_AUTH_PASSWORD`
- `DASHBOARD_AUTH_SECRET`

`tunnel/.env.prod` 必須:
- `AUTOSSH_TARGET`

`tunnel/.env.dev` (dev 外部公開が必要な場合):
- `AUTOSSH_TARGET`
- 推奨: `AUTOSSH_REMOTE_PORT=10422`
- 推奨: `AUTOSSH_LOCAL_PORT=4000`

必要時のみ作成:

```bash
cp tunnel/.env.dev.example tunnel/.env.dev
chmod 600 tunnel/.env.dev
```

## 4. 本番 LaunchAgent 配置

```bash
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist ~/Library/LaunchAgents/
# dev 外部公開が必要な場合のみ:
# cp launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist ~/Library/LaunchAgents/
```

## 5. 本番ロード

```bash
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist 2>/dev/null || true
# launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist
# launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist
```

## 6. ステータス確認

```bash
./launchd/status-prod.sh
./launchd/status-prod.sh --logs
```

## 7. 停止・再起動

```bash
./launchd/stop-prod.sh all
./launchd/restart-prod.sh all
```

個別操作:

```bash
./launchd/stop-prod.sh frontend
./launchd/restart-prod.sh frontend
./launchd/stop-prod.sh backend
./launchd/restart-prod.sh backend
./launchd/stop-prod.sh tunnel
./launchd/restart-prod.sh tunnel
./launchd/stop-prod.sh tunnel-dev
./launchd/restart-prod.sh tunnel-dev
```

## 8. 本番ログ確認

```bash
tail -n 80 <REPO_ROOT>/launchd/logs/backend.prod.err.log
tail -n 80 <REPO_ROOT>/launchd/logs/frontend.prod.err.log
tail -n 80 <REPO_ROOT>/launchd/logs/tunnel.prod.err.log
tail -n 80 <REPO_ROOT>/launchd/logs/tunnel.dev.err.log
```
