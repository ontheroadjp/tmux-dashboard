# Specification Summary

## API 仕様
- `GET /api/health`: `{ "ok": true }`
  - 根拠: `backend/tmux_dashboard/app.py:21`
- `GET /api/snapshot`: tmux 状態 + network 状態 + allowed_actions
  - 根拠: `backend/tmux_dashboard/app.py:25`
- `POST /api/actions/<action>`: action 実行
  - 根拠: `backend/tmux_dashboard/app.py:35`

## action 実装範囲
- `send_keys`, `select_pane`, `select_window`, `switch_client`
- `kill_pane`, `kill_window`, `kill_session`
- `new_window`, `split_window`

根拠:
- 実行分岐: `backend/tmux_dashboard/actions.py:25`
- デフォルト許可一覧: `backend/tmux_dashboard/config.py:8`

## UI 仕様（現状）
- 3秒ポーリングで snapshot 更新
  - 根拠: `frontend/app/page.tsx:6`
- tmux/network/actions を1ページで表示
  - 根拠: `frontend/app/page.tsx:129`
- Material Design 3 ベースの UI（MUI theme + AppBar/Card/Chip/TextField/Button）で構成
  - 根拠: `frontend/app/page.tsx:102`
- 表示機能（snapshot）と操作機能（actions API 呼び出し）は維持
  - 根拠: `frontend/app/page.tsx:75`
- tmux セクションは「セッションカード一覧」をトップ表示とし、選択セッションのウインドウを Tabs で表示
  - 根拠: `frontend/app/page.tsx:229`
- 選択ウインドウ内で pane 情報を表示し、`pane No.{pane.index}` を表示
  - 根拠: `frontend/app/page.tsx:281`
- 初期選択は「番号が最も若いセッション」「index が最小のウインドウ」
  - 根拠: `frontend/app/page.tsx:160`

## 未確認事項
- API 認証方式
  - 確定できない理由: 認証処理が未実装。
  - 次に確認するファイル: `backend/tmux_dashboard/app.py`
- action ごとの安全制約（確認ダイアログ、監査ログ）
  - 確定できない理由: 実装が未存在。
  - 次に確認するファイル: `frontend/app/page.tsx`, `backend/tmux_dashboard/app.py`
