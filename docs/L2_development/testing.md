# Testing

## テストコマンド
- 全テスト: `./scripts/test.sh` (`backend pytest` + `frontend typecheck/build`)
  - 根拠: `scripts/test.sh:46`
- backend のみ: `./scripts/test.sh backend`
  - 根拠: `scripts/test.sh:50`
- frontend のみ: `./scripts/test.sh frontend`
  - 根拠: `scripts/test.sh:53`
- backend 直接: `cd backend && ./venv/bin/pytest -q`
  - 根拠: `.github/workflows/ci.yml:26`

## CI テスト手順
- backend: `python -m venv venv && ./venv/bin/pip install -r requirements.txt && ./venv/bin/pytest -q`
  - 根拠: `.github/workflows/ci.yml:20`
- frontend: `npm ci && npm run typecheck && npm run build`
  - 根拠: `.github/workflows/ci.yml:37`
- CI は `push to main` と `pull_request` 時に実行
  - 根拠: `.github/workflows/ci.yml:3`

## 実装済みテスト（backend）

### test_app.py
- `/api/health` が `{"ok": true}` を返す
  - 根拠: `backend/tests/test_app.py:8`
- `/api/snapshot` が認証なしで 401 を返す
  - 根拠: `backend/tests/test_app.py:17`
- `/api/auth/login` が不正 credentials で 401 を返す
  - 根拠: `backend/tests/test_app.py:26`
- ログイン試行上限超過で 429 を返す（`DASHBOARD_LOGIN_ATTEMPT_LIMIT`）
  - 根拠: `backend/tests/test_app.py:35`
- ロックアウトは `X-Forwarded-For` から forwarded IP をキーとして使う（loopback proxy 経由）
  - 根拠: `backend/tests/test_app.py:53`
- non-loopback remote では `X-Forwarded-For` を無視して `remote_addr` をキーとする
  - 根拠: `backend/tests/test_app.py:76`
- token 取得後に `/api/auth/session` / `/api/snapshot` が正常応答
  - 根拠: `backend/tests/test_app.py:111`
- 許可外 action で 403 を返す
  - 根拠: `backend/tests/test_app.py:138`
- action 失敗時レスポンスに `stderr`/`stdout` が漏洩しない（sanitized）
  - 根拠: `backend/tests/test_app.py:150`
- `/api/panes/<pane_id>` が認証なしで 401 を返す
  - 根拠: `backend/tests/test_app.py:176`
- pane が存在しない場合 404 を返す
  - 根拠: `backend/tests/test_app.py:184`
- pane が存在する場合 200 + detail を返す
  - 根拠: `backend/tests/test_app.py:196`
- `DASHBOARD_AUTH_SECRET` 未設定時に auto-generate される
  - 根拠: `backend/tests/test_app.py:227`
- auto-generate secret は再起動で無効化される
  - 根拠: `backend/tests/test_app.py:234`
- 固定 secret は再起動後も有効
  - 根拠: `backend/tests/test_app.py:251`
- prod 環境では `DASHBOARD_AUTH_SECRET` が必須（未設定で ValueError）
  - 根拠: `backend/tests/test_app.py:268`
- IP 解決: loopback 時は `X-Forwarded-For` 優先、次点 `X-Real-IP`
  - 根拠: `backend/tests/test_app.py:282`

### test_actions.py
- `send_keys` の `-l` リテラル送信が `tmux send-keys -l -t <target> <text>` に変換される
  - 根拠: `backend/tests/test_actions.py:4`
- `send_keys` に `target_pane` がない場合エラー
  - 根拠: `backend/tests/test_actions.py:19`

### test_collectors.py
- 機密文字列（password/token/secret/bearer）がマスクされる
  - 根拠: `backend/tests/test_collectors.py:4`
- `collect_pane_detail` が正常に detail を返す
  - 根拠: `backend/tests/test_collectors.py:22`
- tmux に対象 pane がない場合 None を返す
  - 根拠: `backend/tests/test_collectors.py:71`

## 実装済みテスト（frontend）
- `npm run typecheck`: TypeScript 型検査（`tsc --noEmit`）
  - 根拠: `frontend/package.json:9`
- `npm run build`: Next.js ビルド成功確認（静的解析・ページ生成）
  - 根拠: `frontend/package.json:8`

## 未確認事項
- frontend unit test / e2e test（Jest, Playwright 等）
  - 確定できない理由: `frontend/package.json` に test script が未定義。
  - 次に確認するファイル: `frontend/package.json:scripts`
