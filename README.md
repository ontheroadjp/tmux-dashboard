# tmux-dashboard

ローカル Mac 上の tmux セッションを、スマートフォンを含むブラウザから確認・操作する Web ダッシュボードです。

## Features

- tmux session / window / pane の状態を 3 秒 polling で表示
- pane PID の process 情報と直近出力を表示
- listening server、SSH connection、SSH tunnel 候補を表示
- キー送信、pane/window 選択・削除、session 切替、window 作成、pane 分割
- `DASHBOARD_ALLOWED_ACTIONS` による操作許可の制限
- ID/password + Bearer token と VPS Nginx mTLS/CRL の多重防御
- bootstrap、doctor、monitor、test、launchd 運用 script

実装根拠: `backend/tmux_dashboard/collectors.py`, `backend/tmux_dashboard/actions.py`, `scripts/`

## Installation

Prerequisites:

- Python 3
- Node.js + npm
- tmux
- production tunnel を使う場合は autossh と macOS launchd

非破壊 bootstrap:

```bash
./scripts/bootstrap.sh
```

既存 `.env` は上書きせず、service の start/stop/reload も行いません。frontend build まで行う場合:

```bash
./scripts/bootstrap.sh --build
```

手動 install:

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

cd ../frontend
npm install

cd ..
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev
```

## Usage

Frontend development:

```bash
cd frontend
npm run dev
```

Frontend は `http://127.0.0.1:4000` で起動します。接続先 backend は `frontend/.env.dev` の `BACKEND_API_BASE` で選択します。

Backend development:

```bash
cd backend
./venv/bin/python run.py
```

Backend は既定で `http://127.0.0.1:5001` に bind します。

Test:

```bash
./scripts/test.sh
./scripts/test.sh backend
./scripts/test.sh frontend
```

診断と状態表示:

```bash
./scripts/doctor.sh
./scripts/doctor.sh --logs
./scripts/monitor.sh
```

Production (macOS):

```bash
cd frontend && npm run build
cd ..
./launchd/render-prod-files.sh
```

生成した plist を `~/Library/LaunchAgents/` へ配置して load します。詳細は `launchd/README.md` を参照してください。

```bash
./launchd/status-prod.sh
./launchd/restart-prod.sh all
./launchd/stop-prod.sh all
```

Production (Linux + Tailscale):

```bash
cd frontend && npm run build
cd ..
bash systemd/install.sh
systemctl --user start tmux-dashboard-backend tmux-dashboard-frontend
```

Manual frontend restart on Linux:

```bash
cd frontend && npm run restart
```

## Design Principles

- **ローカルサービスを直接公開しない**: Flask と Next.js は `127.0.0.1` に bind し、外部アクセスは VPS Nginx と autossh reverse tunnel を経由します。
- **多重防御**: アプリ認証、login rate limit、mTLS、CRL を組み合わせます。
- **token を browser JavaScript に渡さない**: Next.js Route Handler が backend token を HttpOnly cookie に保存します。
- **最小権限の tmux 操作**: action は allowlist で制限し、失敗 response に stdout/stderr を含めません。
- **機密情報を表示しない**: process/SSH command の password、token、secret、API key、Bearer token をマスクします。
- **No database**: token は署名付きで自己完結し、runtime state は tmux/OS から都度取得します。
- **template が source of truth**: launchd の生成済み start script/plist ではなく `launchd/templates/` を編集します。

詳細: `docs/L0_concept/policy.md`

## Architecture

```text
[Browser]
    |
    | HTTPS + mTLS
    v
[VPS Nginx]
    |
    | autossh reverse tunnel
    v
[Next.js 127.0.0.1:10322 prod / :4000 dev]
    |
    | HTTP
    v
[Flask 127.0.0.1:10323 prod / :5001 dev]
    |
    | tmux / ps / lsof
    v
[macOS]
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, MUI 7 |
| Backend | Python, Flask 3.1, itsdangerous, gunicorn |
| Runtime | macOS: launchd + autossh / Linux: systemd + Tailscale |
| External ingress | VPS Nginx, HTTPS, mTLS, CRL |

## Configuration

Git 追跡対象の template:

| File | Purpose |
|---|---|
| `backend/.env.dev.example` | backend development |
| `backend/.env.prod.example` | backend production |
| `frontend/.env.dev.example` | Next.js backend 接続先 |
| `frontend/.env.prod.example` | production backend 接続先 |
| `tunnel/.env.dev.example` | development reverse tunnel |
| `tunnel/.env.prod.example` | production reverse tunnel |

主要 backend 設定:

- `DASHBOARD_AUTH_USER`
- `DASHBOARD_AUTH_PASSWORD`
- `DASHBOARD_AUTH_SECRET`（production 必須）
- `DASHBOARD_AUTH_TOKEN_TTL_SEC`
- `DASHBOARD_ALLOWED_ACTIONS`
- `DASHBOARD_CORS_ORIGINS`
- `DASHBOARD_LOGIN_ATTEMPT_LIMIT`
- `DASHBOARD_LOGIN_WINDOW_SEC`
- `DASHBOARD_LOGIN_LOCK_SEC`

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | No | health check |
| POST | `/api/auth/login` | No | login and token issue |
| GET | `/api/auth/session` | Bearer | session verification |
| POST | `/api/auth/logout` | No | logout acknowledgement |
| GET | `/api/snapshot` | Bearer | tmux/network snapshot |
| GET | `/api/panes/<pane_id>` | Bearer | pane metadata and output |
| POST | `/api/actions/<action>` | Bearer | allowed tmux action |

詳細: `docs/L3_implementation/api.md`

## Documentation

- `docs/L0_concept/`: 目的と設計ポリシー
- `docs/L1_project/`: 全体像と repository 構造
- `docs/L2_development/`: 開発、運用、CI、test
- `docs/L3_implementation/`: 実装仕様と API
- `docs/manual/runbook.md`: 詳細運用ガイドの index
