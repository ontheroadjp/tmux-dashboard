# Project Overview

## 目的
- tmux の session/window/pane 状態と pane プロセス状態を Web UI で確認し、tmux 操作を実行する。
- ローカル待受サーバーと SSH 接続/トンネル状態を同一画面で確認する。

## 構成
- `backend/`: Flask API。
  - 根拠: `backend/tmux_dashboard/app.py:1`
  - モジュール構成: `app.py`（エントリ）/ `routes.py`（ルート定義）/ `auth.py`（認証サービス）/ `config.py`（設定）/ `collectors.py`（tmux/network収集）/ `actions.py`（tmux操作）
  - 根拠: `backend/tmux_dashboard/app.py:5-8`
- `frontend/`: Next.js UI。
  - 根拠: `frontend/package.json:6`
  - UI ライブラリ: Material UI (MUI v7 / MD3)。
  - 根拠: `frontend/package.json:11-14`
- `scripts/`: テスト・診断・セットアップスクリプト群。
  - 根拠: `scripts/test.sh`, `scripts/bootstrap.sh`, `scripts/doctor.sh`
- `launchd/`: macOS 本番常駐化 (launchd plist + 起動シェル + テンプレート)。
  - 根拠: `launchd/jp.ontheroad.tmux-dashboard.backend.prod.plist`
- `server/`: VPS Nginx 設定ファイル。CI で自動デプロイされる。
  - 根拠: `server/<nginx-config>.conf`, `.github/workflows/deploy-server-config.yml:7`
- `tunnel/`: autossh トンネル用 env ファイル群 (dev/prod)。
  - 根拠: `tunnel/.env.dev.example`, `tunnel/.env.prod.example`

## 現在の機能（実装済み）
- tmux 状態取得（sessions/windows/panes）。
  - 根拠: `backend/tmux_dashboard/collectors.py:58`
- pane PID から `ps` でプロセス詳細を補完（pid/ppid/user/elapsed/command）。
  - 根拠: `backend/tmux_dashboard/collectors.py:37`
- 機密文字列（password/token/secret/bearer）をプロセス情報からマスク。
  - 根拠: `backend/tmux_dashboard/collectors.py:9`
- listening server / SSH 接続 / SSH トンネル候補の収集。
  - 根拠: `backend/tmux_dashboard/collectors.py:157`
- tmux 操作 API（send_keys/select_pane/select_window/switch_client/kill_pane/kill_window/kill_session/new_window/split_window）。
  - 根拠: `backend/tmux_dashboard/actions.py:146`
- 操作許可範囲の環境変数制御（`DASHBOARD_ALLOWED_ACTIONS`）。
  - 根拠: `backend/tmux_dashboard/config.py:9`
- Bearer token 認証（itsdangerous URLSafeTimedSerializer）。
  - 根拠: `backend/tmux_dashboard/auth.py:15`
- IP ごとのログイン試行回数制限とロックアウト。
  - 根拠: `backend/tmux_dashboard/auth.py:40`, `backend/tmux_dashboard/routes.py:86`
- フロント UI は Material Design 3 コンポーネント構成（MUI ThemeProvider/AppBar/Card/Chip/Tabs など）。
  - 根拠: `frontend/app/page.tsx:1`
- tmux 表示はセッションカード選択とウインドウタブ表示を採用し、pane No. を表示する。
  - 根拠: `frontend/app/page.tsx:344`
- pane 詳細ページ: ウィンドウ切替ドロップダウン（▼ メニュー）付き。
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:340`
- Next.js route handler が Bearer token を HttpOnly cookie に格納し、SSR/CSR を透過的に中継。
  - 根拠: `frontend/app/api/auth/login/route.ts:49`, `frontend/app/api/_shared.ts:5`

## 未確認事項
- action ごとの確認ダイアログ・監査ログ
  - 確定できない理由: 実装が未存在。
  - 次に確認するファイル: `frontend/app/pane/[paneId]/page.tsx`, `backend/tmux_dashboard/routes.py`
