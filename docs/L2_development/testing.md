# Testing

## 実装済みテスト
- backend API のヘルスチェック
  - 根拠: `backend/tests/test_app.py:4`
- 許可外 action の 403 応答
  - 根拠: `backend/tests/test_app.py:13`

## テストコマンド
- `backend_test`: `cd backend && pytest -q`
  - 根拠: `repo.profile.json:11`

## 未確認事項
- frontend 自動テスト（unit/e2e）
  - 確定できない理由: test 設定・test script が未実装。
  - 次に確認するファイル: `frontend/package.json`
