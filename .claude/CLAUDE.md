# tmux-dashboard — CLAUDE.md

このファイルはグローバル `~/.claude/CLAUDE.md` を補完するプロジェクト固有の AI 運用起点です。

## コンテキスト取得

作業開始時に `README.md` の以下のセクションを読んでプロジェクト固有のコンテキストを把握すること:

- **概要 / 主要機能**: 実装済み機能一覧
- **Design Principles**: 守るべき設計制約
- **Quick Start**: run/build/test コマンド

詳細は `docs/` 以下を参照:
- `docs/L0_concept/`: プロダクトコンセプト・セキュリティポリシー
- `docs/L1_project/`: プロジェクト全体像・リポジトリ構造
- `docs/L2_development/`: セットアップ・テスト・CI/CD
- `docs/L3_implementation/`: 実装仕様・API 詳細

## run / build / test コマンド

| 目的 | コマンド |
|---|---|
| frontend 開発起動 | `cd frontend && npm run dev` |
| backend 開発起動 | `cd backend && ./venv/bin/python run.py` |
| backend インストール | `cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt` |
| backend テスト | `cd backend && ./venv/bin/pytest -q` |
| frontend インストール | `cd frontend && npm install` |
| frontend 型検査 | `cd frontend && npm run typecheck` |
| frontend ビルド | `cd frontend && npm run build` |
| 全テスト | `./scripts/test.sh` |
| backend のみ | `./scripts/test.sh backend` |
| frontend のみ | `./scripts/test.sh frontend` |

根拠: `docs/L2_development/setup_and_commands.md`

## Custom Command の使い分け（AI 向けルール）

グローバル CLAUDE.md のルールに従う。本プロジェクトでは:

- `docs/*` への変更が必要な場合 → task フロー（`/work` → task.md）
- `docs/*` 変更不要の場合 → patch フロー（`/work` → patch.md）

ルーティング判定: 「この変更で `docs/*` への追加・変更・削除が必要か？」

## 技術スタック（参考）

- Backend: Python 3.12, Flask 3.1.3, gunicorn 22.0.0
- Frontend: Next.js 15, React 19, TypeScript 5.8, MUI v7（Material Design 3）
- Package manager: pip（backend）/ npm（frontend）
- CI: GitHub Actions（`.github/workflows/ci.yml`）
- Infra: macOS launchd + autossh + VPS Nginx（mTLS）
