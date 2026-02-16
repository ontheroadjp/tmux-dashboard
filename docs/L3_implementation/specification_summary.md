# Specification Summary

## スコープ
- 現時点では「tmux セッション監視ダッシュボード」の実装仕様は未確定。
  - 根拠: `docs/L1_project/repository_inventory.md:4` から `docs/L1_project/repository_inventory.md:9`。

## 確定している仕様
- ドキュメントは3階層構成で管理する。
  - 根拠: `repo.profile.json:4` から `repo.profile.json:8`。
- コマンド定義は `repo.profile.json` を正本として管理する。
  - 根拠: `repo.profile.json:9`。

## 未確認事項
- UI 要件（表示項目、更新頻度、認証要否）。
- バックエンド要件（tmux 情報取得方式、公開 API、権限モデル）。
- テスト要件（unit/integration/e2e の責務分割）。

上記は実装と実行定義が追加された時点で再確定する。
