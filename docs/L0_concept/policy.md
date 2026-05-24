# Policy

## 技術選定ポリシー

### バックエンド

- **Flask（Python）**: 軽量 HTTP サーバーとして選定。ORM・DB は不要（tmux CLI 操作のみ）。
  - 根拠: `backend/requirements.txt:1`
- **itsdangerous（URLSafeTimedSerializer）**: Bearer token の署名・検証に使用。JWT ライブラリを外部依存せず済む最小構成。
  - 根拠: `backend/tmux_dashboard/auth.py:7`, `backend/requirements.txt:2`
- **gunicorn**: 本番 WSGI サーバー。
  - 根拠: `backend/requirements.txt:3`
- **No database**: 認証状態はトークンに自己完結させ、永続化ストアを持たない。ログイン試行カウントはプロセス内メモリで管理（再起動でリセット）。
  - 根拠: `backend/tmux_dashboard/auth.py:18`（in-memory dict）

### フロントエンド

- **Next.js 15 + React 19**: App Router を使用。
  - 根拠: `frontend/package.json:15`
- **Material UI v7（Material Design 3）**: 一貫した UI コンポーネント。
  - 根拠: `frontend/package.json:11-14`
- **npm**: パッケージマネージャー。
  - 根拠: `frontend/package-lock.json`（存在）
- **Next.js route handler が認証中継**: Bearer token を HttpOnly cookie に格納することで、クライアント JS から token を隠蔽する。
  - 根拠: `frontend/app/api/auth/login/route.ts`

### インフラ

- **macOS launchd**: Docker/コンテナなし。macOS の LaunchAgent で backend / frontend / tunnel を永続化。
  - 根拠: `launchd/*.plist`
- **autossh**: SSH リバーストンネルの自動再接続。VPS Nginx ↔ ローカル間の安定した中継。
  - 根拠: `launchd/start-tunnel-prod.sh`

## セキュリティ方針

1. **多重防御**: アプリ認証（ID/Password + Bearer token）+ ネットワーク認証（mTLS）の二層。
2. **rate limiting**: IP ごとのログイン試行上限（既定 5 回 / 600 秒ウィンドウ、超過で 900 秒ロック）。
   - 根拠: `backend/tmux_dashboard/config.py:103`
3. **機密マスク**: tmux pane のプロセス情報（`ps` 出力）から password/token/secret/bearer を `[REDACTED]` に置換してからクライアントに返す。
   - 根拠: `backend/tmux_dashboard/collectors.py:9`
4. **action 失敗時の情報漏洩防止**: action 失敗レスポンスには `code` のみを返し、`stderr`/`stdout` を外部に露出しない。
   - 根拠: `backend/tmux_dashboard/routes.py:47`
5. **CRL（証明書失効リスト）**: Nginx で端末単位の即時無効化が可能。
   - 根拠: `docs/manual/crl-guide.md`
6. **prod では `DASHBOARD_AUTH_SECRET` 必須**: 未設定時に起動失敗させ、意図しないランダム鍵での本番稼働を防ぐ。
   - 根拠: `backend/tmux_dashboard/config.py:87`
7. **IP 解決の優先順位**: remote_addr がループバックの場合のみ `X-Real-IP` → `X-Forwarded-For` を信頼（Nginx `$remote_addr` が `X-Real-IP` に入る前提）。非ループバック接続ではヘッダーを無視。
   - 根拠: `backend/tmux_dashboard/routes.py:19`

## パフォーマンス要件

- **3 秒ポーリング**: フロントエンドは 3 秒間隔で `/api/snapshot` を取得する。tmux 状態が大きくなっても許容されること。
  - 根拠: `frontend/app/page.tsx:39`
- **タイムアウト 5 秒**: tmux/ps コマンド呼び出しに 5 秒タイムアウトを設ける。
  - 根拠: `backend/tmux_dashboard/collectors.py:8`, `backend/tmux_dashboard/actions.py:4`

## 禁止事項・制約

- **直接 tmux コマンド拡張は慎重に**: `allowed_actions` に載っていない action は 403 で拒否される。新 action を追加する場合は `config.py:9` の `DEFAULT_ACTIONS` と `actions.py` の dispatch 分岐を同時に変更すること。
  - 根拠: `backend/tmux_dashboard/routes.py:152`, `backend/tmux_dashboard/config.py:9`
- **DB 導入禁止（ポリシー）**: 認証セッションを永続化する場合は Redis 等を検討すべきだが、現時点では個人利用のため不要。
- **コンテナ化しない**: macOS launchd 前提の設計。Dockerfile は存在しない。

## 未確認事項

- なし
