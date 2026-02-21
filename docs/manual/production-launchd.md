# Production Launchd Manual

## 目的
- 本番モード (`frontend:10322`, `backend:10323`) を `launchd` で常駐運用する。

## 前提
- 実行場所: `<REPO_ROOT>`
- 本番バックエンド: `127.0.0.1:10323`
- 本番フロントエンド: `127.0.0.1:10322`

## 1. テンプレートから本番ファイルを生成

```bash
cd <REPO_ROOT>
./launchd/render-prod-files.sh
```

生成されるローカルファイル（gitignored）:
- `launchd/start-backend-prod.sh`
- `launchd/start-frontend-prod.sh`
- `launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist`
- `launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist`

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
cp launchd/backend.prod.env.example launchd/backend.prod.env
cp launchd/frontend.prod.env.example launchd/frontend.prod.env
chmod 600 launchd/backend.prod.env
```

`launchd/backend.prod.env` 必須:
- `DASHBOARD_AUTH_USER`
- `DASHBOARD_AUTH_PASSWORD`
- `DASHBOARD_AUTH_SECRET`

## 4. 本番 LaunchAgent 配置

```bash
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
```

## 5. 本番ロード

```bash
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
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
```

## 8. 本番ログ確認

```bash
tail -n 80 <REPO_ROOT>/launchd/logs/backend.prod.err.log
tail -n 80 <REPO_ROOT>/launchd/logs/frontend.prod.err.log
```
