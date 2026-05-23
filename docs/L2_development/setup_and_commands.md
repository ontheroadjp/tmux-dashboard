# Setup And Commands

## 前提
- Python 3 (CI: 3.12)
  - 根拠: `.github/workflows/ci.yml:20`
- Node.js (CI: 20)
  - 根拠: `.github/workflows/ci.yml:34`
- npm
- tmux コマンド

## コマンド一覧
- `./dev-up.sh` — backend + frontend を同時起動
- `cd backend && python3 -m venv venv` — venv 作成
- `cd backend && ./venv/bin/pip install -r requirements.txt` — backend 依存インストール
- `cd backend && ./venv/bin/python run.py` — backend 開発サーバー起動
- `cd backend && ./venv/bin/pytest -q` — backend テスト実行
- `cd frontend && npm install` — frontend 依存インストール（ローカル）
- `cd frontend && npm ci` — frontend 依存インストール（CI）
- `cd frontend && npm run dev` — frontend 開発サーバー起動
- `cd frontend && npm run build` — frontend ビルド
- `cd frontend && npm run start` — frontend 本番サーバー起動
- `cd frontend && npm run typecheck` — TypeScript 型検査
- `./scripts/test.sh` — 全テスト（backend pytest + frontend typecheck/build）
- `./scripts/test.sh backend` — backend テストのみ
- `./scripts/test.sh frontend` — frontend テストのみ
- `./scripts/bootstrap.sh` — 非破壊セットアップ
- `./scripts/bootstrap.sh --build` — セットアップ + frontend build
- `./scripts/doctor.sh` — 読み取り専用診断
- `./scripts/doctor.sh --logs` — 診断 + ログ表示

## 実行定義の根拠

### frontend scripts
- `dev`: `next dev -p 4000`
- `build`: `next build`
- `start`: `next start -p 4000`
- `typecheck`: `tsc --noEmit`
  - 根拠: `frontend/package.json:5`

### frontend UI dependencies
- `@mui/material@7.0.2`, `@mui/icons-material@7.0.2`, `@emotion/react@11.14.0`, `@emotion/styled@11.14.1`
- `next@^15.5.10`, `react@19.0.0`, `react-dom@19.0.0`
  - 根拠: `frontend/package.json:11`

### backend 実行ポート
- 開発既定: `127.0.0.1:5001`（`DASHBOARD_PORT` で変更可能）
- 本番（launchd/gunicorn）: `127.0.0.1:10323`
  - 根拠: `backend/run.py:8`

### backend 依存パッケージ
- `Flask==3.0.3`, `pytest==8.3.5`, `gunicorn==22.0.0`
- `itsdangerous` は Flask の transitive dependency として利用（`backend/tmux_dashboard/auth.py:7`）
  - 根拠: `backend/requirements.txt:1`

### backend 設定
- 環境変数ファイル: `DASHBOARD_ENV_FILE` 優先、未指定時は `DASHBOARD_ENV=dev/prod` で `.env.dev` / `.env.prod` を選択
  - 根拠: `backend/tmux_dashboard/config.py:48`
- 開発: `backend/.env.dev`
- 本番: `backend/.env.prod`
- `DASHBOARD_DEBUG` で debug モード切替（既定 false）
  - 根拠: `backend/tmux_dashboard/config.py:99`
- `DASHBOARD_CORS_ORIGINS` に含まれる Origin のみ CORS 許可
  - 根拠: `backend/tmux_dashboard/config.py:100`

### backend 認証環境変数
- `DASHBOARD_AUTH_USER` / `DASHBOARD_AUTH_PASSWORD`: 必須。未設定時は起動失敗。
  - 根拠: `backend/tmux_dashboard/config.py:84`
- `DASHBOARD_AUTH_SECRET`: JWT 署名鍵。prod 環境では必須（未設定時は ValueError）。dev 環境では省略時にランダム生成。
  - 根拠: `backend/tmux_dashboard/config.py:87`
- `DASHBOARD_AUTH_REQUIRE_SECRET_IN_PROD`: prod での secret 必須化フラグ（既定 "1" = true）
  - 根拠: `backend/tmux_dashboard/config.py:87`
- `DASHBOARD_AUTH_TOKEN_TTL_SEC`: token 有効期間秒（既定 86400 = 24h、最小 60）
  - 根拠: `backend/tmux_dashboard/config.py:93`
- `DASHBOARD_LOGIN_ATTEMPT_LIMIT`: IP ごとのログイン失敗上限（既定 5、最小 1）
  - 根拠: `backend/tmux_dashboard/config.py:105`
- `DASHBOARD_LOGIN_WINDOW_SEC`: 失敗カウント集計ウィンドウ秒（既定 600、最小 60）
  - 根拠: `backend/tmux_dashboard/config.py:106`
- `DASHBOARD_LOGIN_LOCK_SEC`: ロックアウト継続秒（既定 900、最小 60）
  - 根拠: `backend/tmux_dashboard/config.py:107`

### frontend 設定
- `NEXT_PUBLIC_API_BASE`: 未設定時は same-origin `/api/*` を経由して Next.js route handler が backend へ中継
  - 根拠: `frontend/lib/api.ts:1`
- `BACKEND_API_BASE`: Next.js route handler から backend への接続先。未設定時は `NODE_ENV` で切替
  - development: `http://127.0.0.1:5001`
  - production: `http://127.0.0.1:10323`
  - 根拠: `frontend/app/api/_shared.ts:3`
- 開発: `frontend/.env.dev`、本番: `frontend/.env.prod`

### frontend 認証中継
- Bearer token は Next.js route handler がログイン時に HttpOnly cookie (`tmux_dashboard_token`) に格納
- 以降のリクエストは cookie から token を取り出し、backend へ `Authorization: Bearer` として転送
  - 根拠: `frontend/app/api/auth/login/route.ts:49`, `frontend/app/api/_shared.ts:11`

### frontend 実行ポート
- dev / start: `4000`（`package.json:6` の `-p 4000` による固定）
- 本番（launchd/next start）: `10322`
  - 根拠: `frontend/package.json:5`

## 未確認事項
- なし（CI 定義と実体の突合完了）
