# scripts/tests/test_venv.sh

一時的な fixture 内で bootstrap と doctor を実行し、backend venv 診断の正常系、Python バージョン不一致、依存関係の import 失敗を検証する。実際の backend venv やサービスは変更しない。根拠: `scripts/tests/test_venv.sh:13-48`
