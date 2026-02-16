# Project Overview

## 目的
- tmux の session/window/pane 状態と pane プロセス状態を Web UI で確認し、tmux 操作を実行する。
- ローカル待受サーバーと SSH 接続/トンネル状態を同一画面で確認する。

## 構成
- `backend/`: Flask API。
  - 根拠: `backend/tmux_dashboard/app.py:10`
- `frontend/`: Next.js UI。
  - 根拠: `frontend/package.json:6`
  - 補足: UI ライブラリとして Material UI を利用。
  - 根拠: `frontend/package.json:11`

## 現在の機能（実装済み）
- tmux 状態取得（sessions/windows/panes）。
  - 根拠: `backend/tmux_dashboard/collectors.py:36`
- pane PID から `ps` でプロセス詳細を補完。
  - 根拠: `backend/tmux_dashboard/collectors.py:15`
- listening server / SSH 接続 / SSH トンネル候補の収集。
  - 根拠: `backend/tmux_dashboard/collectors.py:136`
- tmux 操作 API（send/select/kill/new/split）。
  - 根拠: `backend/tmux_dashboard/actions.py:25`
- 操作許可範囲の環境変数制御（`DASHBOARD_ALLOWED_ACTIONS`）。
  - 根拠: `backend/tmux_dashboard/config.py:26`
- フロント UI は Material Design 3 コンポーネント構成（MUI ThemeProvider/AppBar/Card/Chip など）。
  - 根拠: `frontend/app/page.tsx:1`
- tmux 表示はセッションカード選択とウインドウタブ表示を採用し、pane No. を表示する。
  - 根拠: `frontend/app/page.tsx:229`

## 未確認事項
- 本番運用時の認証・認可要件。
  - 確定できない理由: 認証実装が未存在。
  - 次に確認するファイル: `backend/tmux_dashboard/app.py`
- CI/CD 方針。
  - 確定できない理由: `.github/workflows/` が未存在。
  - 次に確認するファイル: `.github/workflows/*.yml`
