# Development Manual

## 目的
- 開発用サーバーを手動で起動・停止・確認する。

## 前提
- 実行場所: `<REPO_ROOT>`
- 開発バックエンド: `127.0.0.1:5001`
- 開発フロントエンド: `127.0.0.1:4000`
- `backend/venv` と `frontend/node_modules` がセットアップ済みであること。
- `backend/.env.dev` と `frontend/.env.dev` が配置済みであること。

## 0. 開発用 env の作成

```bash
cd <REPO_ROOT>
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev
```

## 1. バックエンド起動

```bash
cd <REPO_ROOT>/backend
DASHBOARD_ENV=dev ./venv/bin/python run.py
```

## 2. フロントエンド起動

```bash
cd <REPO_ROOT>/frontend
npm run dev
```

## 3. 動作確認
- UI: `http://127.0.0.1:4000`
- health API: `http://127.0.0.1:5001/api/health`

```bash
curl -i http://127.0.0.1:5001/api/health
./scripts/monitor.sh
```

## 4. 停止

各 server を起動したターミナルで `Ctrl+C` を入力する。
