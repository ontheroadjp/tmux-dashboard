# Project Overview

## 目的
この文書は、現時点のリポジトリ実体を根拠付きで固定化する。

## 現状（確定事項）
- リポジトリルートには実装コードが存在しない。
  - 根拠: `docs/L1_project/repository_inventory.md:4` から `docs/L1_project/repository_inventory.md:9`。
- ドキュメント管理の基準点は `repo.profile.json` である。
  - 根拠: `repo.profile.json:1` から `repo.profile.json:10`。
- ドキュメントルートは `docs/L1_project` `docs/L2_development` `docs/L3_implementation` の3系統で運用する。
  - 根拠: `repo.profile.json:4` から `repo.profile.json:8`。

## 未確認事項
- 実装言語、ランタイム、主要エントリポイント。
  - 確定できない理由: 実装ファイルが未作成。
  - 次に確認するファイル: `package.json` `pyproject.toml` `go.mod` `src/main.*` `app/*`。
- CI 定義。
  - 確定できない理由: `.github/workflows/` が未作成。
  - 次に確認するファイル: `.github/workflows/*.yml`。
