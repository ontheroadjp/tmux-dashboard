# scripts/bootstrap.sh

環境ファイル、依存関係、launchd runtime ファイルを準備する。既存の環境ファイルとサービスの稼働状態は保持する。

依存関係の導入時、既存 backend venv の作成時 Python と実行時 Python の major/minor を比較する。不一致や取得失敗時は環境を自動削除せず、復旧方法を示して停止する。`--skip-install` はこの検査を含む依存関係の導入を省略する。根拠: `scripts/bootstrap.sh:73-110`

`scripts/doctor.sh` は読み取り専用の診断を提供する。

## 変更履歴（git log より自動生成）

- ef31a1d fix(#53): detect broken backend virtual environments
- 75d0ace feat(scripts): add safe bootstrap and doctor commands
