# tmux-dashboard

ローカル Mac 上の tmux セッション状態をブラウザ（スマホ含む）から確認・操作する Web ダッシュボードです。

## 概要

### 主要機能

**表示（3秒ポーリング）**
- tmux の sessions / windows / panes 状態
- pane プロセス詳細（PID → `ps` で補完）
- listening server / SSH接続 / SSH トンネル候補

**操作（Actions）**
- `send_keys`, `select_pane/window`, `switch_client`
- `kill_pane/window/session`
- `new_window`, `split_window`
- 操作許可範囲は環境変数 `DASHBOARD_ALLOWED_ACTIONS` で制御

### 構成

```
[iPhone / Browser]
       ↓ HTTPS + mTLS (クライアント証明書)
[VPS: Nginx]
       ↓ SSH Reverse Tunnel (autossh)
[localhost: Next.js  :10322 / :4000 (dev)]
       ↓ HTTP (same host)
[localhost: Flask    :10323 / :5001 (dev)]
       ↓ CLI
[tmux]
```

| レイヤー | 技術 | ポート (dev / prod) |
|---|---|---|
| Frontend | Next.js + Material UI (MUI/MD3) | 4000 / 10322 |
| Backend | Flask (Python) | 5001 / 10323 |
| インフラ | macOS launchd + autossh | — |

---

## Prerequisites

- Python 3
- Node.js + npm
- tmux

---

## Quick Start — Development

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

- Frontend: `http://127.0.0.1:4000`
- Backend: `http://127.0.0.1:5001`

---

## Quick Start — Production (launchd)

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
# - backend/.env.prod  : DASHBOARD_AUTH_USER / DASHBOARD_AUTH_PASSWORD / DASHBOARD_AUTH_SECRET
# - tunnel/.env.prod   : AUTOSSH_TARGET

# 3) render launchd runtime files
./launchd/render-prod-files.sh

# 4) install/load launch agents
mkdir -p ~/Library/LaunchAgents
cp launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist  ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.frontend.prod.plist ~/Library/LaunchAgents/
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.prod.plist   ~/Library/LaunchAgents/

launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist  2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist 2>/dev/null || true
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist   2>/dev/null || true

launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.backend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.frontend.prod.plist
launchctl load ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.prod.plist
```

- Frontend: `http://127.0.0.1:10322`
- Backend: `http://127.0.0.1:10323`

運用確認:

```bash
./launchd/status-prod.sh
./launchd/status-prod.sh --logs
```

---

## Dev External Publish (Optional)

dev 環境を外部端末から確認する場合のみ:

```bash
cp tunnel/.env.dev.example tunnel/.env.dev
# edit tunnel/.env.dev (AUTOSSH_TARGET など)

./launchd/render-prod-files.sh
cp launchd/jp.ontheroad.tmux-dashboard.tunnel.dev.plist ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist 2>/dev/null || true
launchctl load   ~/Library/LaunchAgents/jp.ontheroad.tmux-dashboard.tunnel.dev.plist
```

---

## Bootstrap / Doctor

初回セットアップや定期診断は以下を利用できます。

```bash
# 非破壊セットアップ
# - 既存 .env は上書きしない
# - 既存プロセスの start/stop/reload はしない
./scripts/bootstrap.sh

# 必要時のみ frontend build まで実施
./scripts/bootstrap.sh --build

# 読み取り専用診断
./scripts/doctor.sh
./scripts/doctor.sh --logs
```

---

## API

| Method | Path | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/health` | 不要 | ヘルスチェック |
| POST | `/api/auth/login` | 不要 | user/password → Bearer token 発行 |
| GET | `/api/auth/session` | Bearer | 認証済みユーザー返却 |
| POST | `/api/auth/logout` | Bearer | ログアウト |
| GET | `/api/snapshot` | Bearer | tmux状態 + ネットワーク状態 + allowed_actions |
| GET | `/api/panes/<pane_id>` | Bearer | pane メタ情報 + 現在出力 |
| POST | `/api/actions/<action>` | Bearer | tmux 操作実行 |

---

## Security

認証は **ID/Password + Bearer token** と **mTLS（クライアント証明書）** の多重防御を推奨します。

- **アプリ認証**: `DASHBOARD_AUTH_USER` / `DASHBOARD_AUTH_PASSWORD` で設定。`DASHBOARD_AUTH_SECRET` 未設定時は起動時にランダム生成。
- **mTLS**: VPS Nginx でクライアント証明書を必須化し、証明書のない端末をブロック。
- **CRL**: 証明書失効リストで端末単位の即時無効化が可能。
- **SSHトンネル**: backend ポート `10323` は外部公開せず、frontend 経由のみを推奨。

詳細は `docs/manual/mtls-guide.md` / `docs/manual/crl-guide.md` を参照。

---

## Env Files

実体ファイル（ローカル用 / Git ignore）:

| ファイル | 用途 |
|---|---|
| `backend/.env.dev` | backend 開発設定 |
| `backend/.env.prod` | backend 本番設定 |
| `frontend/.env.dev` | frontend 開発設定 |
| `frontend/.env.prod` | frontend 本番設定 |
| `tunnel/.env.dev` | tunnel 開発設定 |
| `tunnel/.env.prod` | tunnel 本番設定 |

各ファイルの `.example` がテンプレートとして Git 追跡されています。

---

## Operations

```bash
# 本番再起動
./launchd/restart-prod.sh all

# 本番停止
./launchd/stop-prod.sh all

# 個別制御
./launchd/restart-prod.sh backend
./launchd/restart-prod.sh frontend
./launchd/restart-prod.sh tunnel
./launchd/restart-prod.sh tunnel-dev
```

---

## Testing

```bash
# all (backend pytest + frontend typecheck/build)
./scripts/test.sh

# backend only
./scripts/test.sh backend

# frontend only
./scripts/test.sh frontend
```

CI でも同じ方針で自動実行されます（`.github/workflows/ci.yml`）。

---

## Documentation

| ドキュメント | 内容 |
|---|---|
| `docs/manual/runbook.md` | Runbook インデックス |
| `docs/manual/development.md` | 開発運用手順 |
| `docs/manual/production-launchd.md` | 本番常駐運用（launchd） |
| `docs/manual/tunnel-and-nginx.md` | SSHトンネル + Nginx 設定 |
| `docs/manual/mtls-guide.md` | mTLS 設定ガイド（初学者向け） |
| `docs/manual/crl-guide.md` | CRL 失効運用ガイド |
