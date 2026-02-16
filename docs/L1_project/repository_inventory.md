# Repository Inventory

## トップレベル
- `backend/` Flask バックエンド
- `frontend/` Next.js フロントエンド
- `docs/` L1/L2/L3 ドキュメント
- `repo.profile.json` 契約ファイル

## 主要エントリポイント
- backend 起動: `backend/run.py`
  - 根拠: `backend/run.py:5`
- frontend 起動: `frontend/package.json` の `scripts.dev`
  - 根拠: `frontend/package.json:6`

## 備考
- 現時点で `.github/workflows/` は未存在。
  - 根拠: ルート配下探索結果
- 生成物ディレクトリ（`frontend/.next`, `frontend/node_modules`, `backend/.pytest_cache`）は存在する。
  - 根拠: ファイル探索結果
