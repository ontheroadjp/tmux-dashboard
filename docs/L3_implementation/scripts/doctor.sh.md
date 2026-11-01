# scripts/doctor.sh

環境ファイル、依存関係、生成ファイル、launchd、待受ポートを読み取り専用で診断する。

backend venv の設定に記載された作成時の Python major/minor と実行時バージョンを比較し、Gunicorn と Flask の import を確認する。失敗は hard failure として報告し、再作成や依存関係の再インストールを案内する。根拠: `scripts/doctor.sh:108-135`

`scripts/bootstrap.sh` は依存関係を導入する際にバージョン不一致を検出する。

## 変更履歴（git log より自動生成）

- ef31a1d fix(#53): detect broken backend virtual environments
- 75d0ace feat(scripts): add safe bootstrap and doctor commands
