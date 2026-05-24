# CI/CD

## ワークフロー一覧

| ファイル | トリガー | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | push to main / pull_request | backend pytest + frontend typecheck + build |
| `.github/workflows/deploy-server-config.yml` | push to main（`server/**` 変更時）| VPS Nginx 設定を自動デプロイ |

## ci.yml — テスト CI

根拠: `.github/workflows/ci.yml`

### backend-tests ジョブ

- OS: `ubuntu-latest`
- Python: `3.12`（`actions/setup-python@v5`）
- 手順:
  1. `python -m venv venv`
  2. `./venv/bin/pip install --upgrade pip`
  3. `./venv/bin/pip install -r requirements.txt`
  4. `./venv/bin/pytest -q`
- working-directory: `backend`

### frontend-checks ジョブ

- OS: `ubuntu-latest`
- Node.js: `20`（`actions/setup-node@v4`）
- キャッシュ: `npm`（`cache-dependency-path: frontend/package-lock.json`）
- 手順:
  1. `npm ci`
  2. `npm run typecheck`（`tsc --noEmit`）
  3. `npm run build`
- working-directory: `frontend`

## deploy-server-config.yml — Nginx 設定自動デプロイ

根拠: `.github/workflows/deploy-server-config.yml`

### 実行条件

- `push` to `main` かつ `server/**` にファイル変更がある場合
- または `workflow_dispatch`（手動実行）
- 並列実行防止: `concurrency.group: deploy-server-config`（進行中のジョブをキャンセルしない）

### デプロイ内容

- `server/tunnel.starton.jp.conf` を VPS の `/etc/nginx/sites-available/tunnel.starton.jp.conf` に転送
- `sudo nginx -t` 成功時のみ `sudo systemctl reload nginx`
- 失敗時: 自動ロールバック（`cp backup → original`）

### 必要な GitHub Secrets

| Secret | 用途 |
|---|---|
| `VPS_HOST` | VPS ホスト名 / IP |
| `VPS_USER` | SSH ユーザー名 |
| `VPS_SSH_KEY` | SSH 秘密鍵 |
| `VPS_PORT` | SSH ポート（省略時: 22） |

## 未確認事項

- なし
