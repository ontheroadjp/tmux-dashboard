# Specification Summary

## API 仕様
- `GET /api/health`: `{ "ok": true }`
  - 根拠: `backend/tmux_dashboard/app.py:44`
- `POST /api/auth/login`: user/password で認証し Bearer token を発行
  - 根拠: `backend/tmux_dashboard/app.py:48`
- `DASHBOARD_AUTH_SECRET` 未設定時は起動時にランダム生成された secret を署名鍵として利用
  - 根拠: `backend/tmux_dashboard/config.py:39`
- `GET /api/auth/session`: Bearer token を検証し認証済みユーザーを返す
  - 根拠: `backend/tmux_dashboard/app.py:68`
- `POST /api/auth/logout`: フロント側ログアウト連携
  - 根拠: `backend/tmux_dashboard/app.py:76`
- `GET /api/snapshot`: 認証済みのみ。tmux 状態 + network 状態 + allowed_actions
  - 根拠: `backend/tmux_dashboard/app.py:80`
- `GET /api/panes/<pane_id>`: 認証済みのみ。pane メタ情報 + pane 現在出力を返す
  - 根拠: `backend/tmux_dashboard/app.py:95`
- `POST /api/actions/<action>`: 認証済みのみ action 実行
  - 根拠: `backend/tmux_dashboard/app.py:106`

## action 実装範囲
- `send_keys`, `select_pane`, `select_window`, `switch_client`
- `kill_pane`, `kill_window`, `kill_session`
- `new_window`, `split_window`

根拠:
- 実行分岐: `backend/tmux_dashboard/actions.py:25`
- デフォルト許可一覧: `backend/tmux_dashboard/config.py:8`

## UI 仕様（現状）
- 初回表示時に `/api/auth/session` でセッション確認。未認証の場合はログイン画面を表示
  - 根拠: `frontend/app/page.tsx:97`
- ログインは `/api/auth/login`、ログアウトは `/api/auth/logout` を使用
  - 根拠: `frontend/lib/api.ts:97`
- 3秒ポーリングで snapshot 更新
  - 根拠: `frontend/app/page.tsx:34`
- tmux/network/actions を1ページで表示
  - 根拠: `frontend/app/page.tsx:268`
- Material Design 3 ベースの UI（MUI theme + AppBar/Card/Chip/TextField/Button）で構成
  - 根拠: `frontend/app/page.tsx:44`
- 表示機能（snapshot）と操作機能（actions API 呼び出し）は維持
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:112`
- tmux セクションは「セッションカード一覧」をトップ表示とし、選択セッションのウインドウを Tabs で表示
  - 根拠: `frontend/app/page.tsx:330`
- 選択ウインドウ内で pane 情報を表示し、`pane No.{pane.index}` を表示
  - 根拠: `frontend/app/page.tsx:382`
- トップページは Actions セクションを表示せず、pane クリックで `/pane/[paneId]` に遷移する
  - 根拠: `frontend/app/page.tsx:337`
  - 根拠: `frontend/app/page.tsx:368`
- pane 詳細ページは「pane情報 + 現在出力 + Actions」を表示し、Actions の対象は選択中 pane 固定
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:199`
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:231`
- 初期選択は「番号が最も若いセッション」「index が最小のウインドウ」
  - 根拠: `frontend/app/page.tsx:153`

## 未確認事項
- action ごとの安全制約（確認ダイアログ、監査ログ）
  - 確定できない理由: 実装が未存在。
  - 次に確認するファイル: `frontend/app/page.tsx`, `backend/tmux_dashboard/app.py`
