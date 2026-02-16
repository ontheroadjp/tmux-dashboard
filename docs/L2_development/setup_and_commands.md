# Setup And Commands

## 前提
- Python 3
- Node.js + npm
- tmux コマンド

## 契約コマンド（repo.profile.json）
- `backend_install`: `python3 -m pip install -r backend/requirements.txt`
- `backend_dev`: `cd backend && python3 run.py`
- `backend_test`: `cd backend && pytest -q`
- `frontend_install`: `cd frontend && npm install`
- `frontend_dev`: `cd frontend && NEXT_PUBLIC_API_BASE=http://127.0.0.1:5001 npm run dev`
- `frontend_build`: `cd frontend && npm run build`
- `frontend_start`: `cd frontend && npm run start`

根拠: `repo.profile.json:9`

## 実行定義の根拠
- frontend scripts: `dev/build/start`
  - 根拠: `frontend/package.json:5`
- backend 実行ポート `127.0.0.1:5001`
  - 根拠: `backend/run.py:6`
- frontend 参照先 API 既定値 `http://127.0.0.1:5001`
  - 根拠: `frontend/lib/api.ts:1`

## 未確認事項
- CI 上の標準実行手順。
  - 確定できない理由: `.github/workflows/` が未存在。
  - 次に確認するファイル: `.github/workflows/*.yml`
