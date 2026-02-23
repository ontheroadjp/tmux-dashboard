# Setup And Commands

## 前提
- Python 3
- Node.js + npm
- tmux コマンド

## 契約コマンド（repo.profile.json）
- `backend_venv`: `cd backend && python3 -m venv venv`
- `backend_install`: `cd backend && ./venv/bin/pip install -r requirements.txt`
- `backend_dev`: `cd backend && ./venv/bin/python run.py`
- `backend_test`: `cd backend && ./venv/bin/pytest -q`
- `frontend_install`: `cd frontend && npm install`
- `frontend_dev`: `cd frontend && npm run dev`
- `frontend_build`: `cd frontend && npm run build`
- `frontend_start`: `cd frontend && npm run start`

根拠: `repo.profile.json:9`

## 実行定義の根拠
- frontend scripts: `dev/build/start`
  - 根拠: `frontend/package.json:5`
- frontend UI dependencies: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`
  - 根拠: `frontend/package.json:11`
- backend 実行ポート
  - 開発既定: `127.0.0.1:5001`（`DASHBOARD_PORT` で変更可能）
  - 本番（launchd/gunicorn）: `127.0.0.1:10323`
  - 根拠: `backend/run.py:6`
- backend 設定ファイル
  - 開発: `backend/.env.dev`
  - 本番: `backend/.env.prod`
  - 根拠: `backend/tmux_dashboard/config.py:34`
- 証明書ダッシュボードのデータ保存先は `DASHBOARD_CERT_DASHBOARD_DATA_FILE`（未設定時は `backend/data/cert_dashboard.json`）
  - 根拠: `backend/tmux_dashboard/config.py:109`
  - 根拠: `backend/tmux_dashboard/cert_dashboard.py:40`
- backend debug 切替は `DASHBOARD_DEBUG`（既定は false）
  - 根拠: `backend/tmux_dashboard/config.py:78`
- backend CORS は `DASHBOARD_CORS_ORIGINS` に含まれる Origin のみ許可
  - 根拠: `backend/tmux_dashboard/app.py:44`
- backend 認証は `DASHBOARD_AUTH_USER` / `DASHBOARD_AUTH_PASSWORD` と Bearer token で実施
  - 根拠: `backend/tmux_dashboard/config.py:31`
  - 根拠: `backend/tmux_dashboard/app.py:50`
- `DASHBOARD_AUTH_SECRET` 未設定時はプロセス起動時にランダム値を自動生成する
  - 根拠: `backend/tmux_dashboard/config.py:39`
- frontend API 参照先は `NEXT_PUBLIC_API_BASE` 優先。未指定時は same-origin `/api/*` を利用し、Next route handler から backend へ中継する。
  - 根拠: `frontend/lib/api.ts:1`
  - 根拠: `frontend/app/api/snapshot/route.ts:1`
- frontend 認証中継は `/api/auth/login|session|logout` を使い、HttpOnly cookie を保持する
  - 根拠: `frontend/app/api/auth/login/route.ts:1`
  - 根拠: `frontend/app/api/auth/session/route.ts:1`
  - 根拠: `frontend/app/api/auth/logout/route.ts:1`
- frontend は `/api/panes/[paneId]` で pane 詳細（出力含む）を backend `/api/panes/<pane_id>` に中継する
  - 根拠: `frontend/app/api/panes/[paneId]/route.ts:1`
  - 根拠: `backend/tmux_dashboard/routes.py:140`
- frontend は `/api/certs/[...segments]` で証明書ダッシュボードAPIを backend `/api/certs/*` に中継する
  - 根拠: `frontend/app/api/certs/[...segments]/route.ts:1`
  - 根拠: `backend/tmux_dashboard/routes.py:180`
- backend 中継先は `BACKEND_API_BASE` 優先、未指定時は `NODE_ENV` で切替
  - development: `http://127.0.0.1:5001`
  - production: `http://127.0.0.1:10323`
  - 根拠: `frontend/app/api/_shared.ts:3`
- frontend 実行ポート
  - 開発 (`npm run dev`): `4000`
  - start script (`npm run start`): `4000`
  - 本番（launchd/next start）: `10322`
  - 根拠: `frontend/package.json:5`
- frontend 設定ファイル
  - 開発: `frontend/.env.dev`
  - 本番: `frontend/.env.prod`

## 未確認事項
- CI 上の標準実行手順。
  - 確定できない理由: `.github/workflows/` が未存在。
  - 次に確認するファイル: `.github/workflows/*.yml`
