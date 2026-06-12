# Test

## Test Strategy

Backend は pytest で API、認証、action、collector の振る舞いを検証する。Frontend は TypeScript typecheck と Next.js production build を CI gate とする。

根拠: `.github/workflows/ci.yml:9-44`, `backend/tests/`, `frontend/package.json:scripts`

## 実行方法

全体:

```bash
./scripts/test.sh
```

backend のみ:

```bash
./scripts/test.sh backend
```

frontend のみ:

```bash
./scripts/test.sh frontend
```

根拠: `scripts/test.sh:7-65`

CI 相当の個別 command:

```bash
cd backend && ./venv/bin/pytest -q
cd frontend && npm run typecheck
cd frontend && npm run build
```

根拠: `.github/workflows/ci.yml:24-25`, `.github/workflows/ci.yml:41-44`

## Backend Coverage

- health、認証必須 endpoint、login failure/rate limit、token lifecycle。根拠: `backend/tests/test_app.py`
- proxy header を使う client IP 解決。根拠: `backend/tests/test_app.py`
- allowed action 制御と action error response の sanitization。根拠: `backend/tests/test_app.py`
- `send_keys` literal mode と必須 target。根拠: `backend/tests/test_actions.py`
- command 内 secret masking と pane detail 取得。根拠: `backend/tests/test_collectors.py`

## Frontend Coverage

`npm run typecheck` は strict TypeScript check、`npm run build` は Next.js production build を検証する。unit test、component test、E2E test の script と framework は存在しない。

根拠: `frontend/package.json:5-25`, `frontend/tsconfig.json:2-19`

## Coverage Policy

coverage threshold や coverage report command は定義されていない。変更時は blast radius に応じて既存 pytest を追加し、frontend は最低限 typecheck/build を通す。

## 未確認事項

- frontend の操作フローを自動検証する方針。理由: test runner と E2E framework がない。確認先: 将来の `frontend/package.json:scripts` と CI workflow。
- 数値 coverage 目標。理由: pytest coverage plugin と CI threshold がない。確認先: `backend/requirements.txt` と `.github/workflows/ci.yml`。
