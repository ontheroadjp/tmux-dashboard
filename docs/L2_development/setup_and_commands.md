# Setup And Commands

## 方針
このリポジトリで実行可能コマンドを定義する際は、必ず `repo.profile.json` に登録する。

## 現在の登録状態
- `commands` は空。
  - 根拠: `repo.profile.json:9`。
- package manager は `unknown`。
  - 根拠: `repo.profile.json:3`。

## 追加時の契約
- 新規コマンドを docs に記載する前に `repo.profile.json` の `commands` を更新する。
- CI に追加したコマンドは docs と `repo.profile.json` の両方に反映する。

## 未確認事項
- 開発起動コマンド (`dev`)、ビルドコマンド (`build`)、テストコマンド (`test`)。
  - 確定できない理由: 実行定義ファイルが未存在。
  - 次に確認するファイル: `package.json` `Makefile` `justfile` `.github/workflows/*.yml`。
