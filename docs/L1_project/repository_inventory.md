# Repository Inventory

## トップレベル
- `backend/` Flask バックエンド
- `frontend/` Next.js フロントエンド
- `launchd/` macOS 本番常駐化 (launchd plist + 起動シェル + テンプレート)
- `scripts/` テスト・診断・セットアップスクリプト
- `server/` VPS Nginx 設定 (CI 自動デプロイ対象)
- `tunnel/` autossh トンネル用 env ファイル
- `docs/` L1/L2/L3 ドキュメント + manual
- `.github/workflows/` CI/CD ワークフロー

根拠: ルート配下探索結果（2026-05-23 時点）

## 主要エントリポイント
- 開発一括起動: `./dev-up.sh`
  - 根拠: `dev-up.sh:1`
- backend 起動: `backend/run.py`
  - 根拠: `backend/run.py:5`
- frontend 起動: `frontend/package.json` の `scripts.dev`
  - 根拠: `frontend/package.json:6`

## backend モジュール構成
```
backend/tmux_dashboard/
  app.py       - create_app() ファクトリ。Flask インスタンス生成と依存注入。
  routes.py    - 全 HTTP ルート定義 (register_routes)。
  auth.py      - AuthService: token 発行/検証・rate limit ロジック。
  config.py    - AppConfig dataclass + load_config() 環境変数読み込み。
  collectors.py - tmux/network 状態収集。機密マスク処理を含む。
  actions.py   - tmux コマンド実行ハンドラ群。
```
根拠: `backend/tmux_dashboard/app.py:5-8`

## frontend ルート構成
```
frontend/app/
  page.tsx                        - トップページ (ログイン + tmux/network ダッシュボード)
  pane/[paneId]/page.tsx          - pane 詳細ページ
  layout.tsx                      - 共通レイアウト
  api/_shared.ts                  - backend URL 解決・cookie ヘルパー
  api/auth/login/route.ts         - POST /api/auth/login 中継
  api/auth/session/route.ts       - GET /api/auth/session 中継
  api/auth/logout/route.ts        - POST /api/auth/logout 中継 + cookie クリア
  api/snapshot/route.ts           - GET /api/snapshot 中継
  api/panes/[paneId]/route.ts     - GET /api/panes/[paneId] 中継
  api/actions/[action]/route.ts   - POST /api/actions/[action] 中継
```
根拠: `frontend/app/` ファイル探索結果

## CI/CD ワークフロー
- `ci.yml`: push to main / PR 時に backend pytest + frontend typecheck/build を実行。
  - 根拠: `.github/workflows/ci.yml:3`
- `deploy-server-config.yml`: push to main で `server/**` が変更された場合、VPS の Nginx 設定を自動デプロイ。
  - 根拠: `.github/workflows/deploy-server-config.yml:6`

## 備考
- 生成物ディレクトリ（`frontend/.next`, `frontend/node_modules`, `backend/.pytest_cache`, `backend/venv`）は Git 管理外。
