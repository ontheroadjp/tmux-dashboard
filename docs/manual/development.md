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

## 1. `dev-up.sh` で同時起動

```bash
cd <REPO_ROOT>
./dev-up.sh
```

## 2. 個別起動

### 2-1. バックエンド

```bash
cd <REPO_ROOT>/backend
DASHBOARD_ENV=dev ./venv/bin/python run.py
```

### 2-2. フロントエンド

```bash
cd <REPO_ROOT>/frontend
npm run dev
```

## 3. 動作確認
- UI: `http://127.0.0.1:4000`
- API: `http://127.0.0.1:5001/api/snapshot`

```bash
curl -i http://127.0.0.1:5001/api/snapshot
```

## 4. 停止
- 起動中ターミナルで `Ctrl+C`。
- 残プロセスがある場合のみ以下を実行。

```bash
pkill -f "backend/run.py" || true
pkill -f "next dev -p 4000" || true
```
