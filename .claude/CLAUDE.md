# tmux-dashboard - CLAUDE.md

このファイルはプロジェクト固有の AI 運用起点である。

## コンテキスト取得

作業開始時に `README.md` の以下を確認する:

- `Features`: 実装済み機能
- `Usage`: run/build/test/operation command
- `Design Principles`: 変更時に維持する制約

詳細調査の入口:

- 実装責務: `docs/L3_implementation/specification_summary.md`
- repository 構造: `docs/L1_project/repository_structure.md`
- API: `docs/L3_implementation/api.md`
- 開発運用: `docs/L2_development/operation_model.md`

## Commands

| 目的 | Command |
|---|---|
| bootstrap | `./scripts/bootstrap.sh` |
| frontend 開発 | `cd frontend && npm run dev` |
| backend 開発 | `cd backend && ./venv/bin/python run.py` |
| 全 test | `./scripts/test.sh` |
| backend test | `./scripts/test.sh backend` |
| frontend check | `./scripts/test.sh frontend` |
| read-only 診断 | `./scripts/doctor.sh` |
| 状態表示 | `./scripts/monitor.sh` |
| launchd runtime 生成 | `./launchd/render-prod-files.sh` |

Command の source of truth: `docs/.ai/repo.profile.json`

## Custom / Command の使い分け（AI向けルール）

- `review-resolve.md`: PR review comment 対応専用。checkout、実装、commit、push、reply を自己完結させる。
- `work.md`: review-resolve 以外の作業の入口。gate、workspace、調査、routing を行う。
- `task.md`: ドキュメント変更を伴う実装に特化。issue 自動生成から実装、draft PR 作成まで行い、`docs/*` 自体は変更しない。
- `patch.md`: ドキュメント変更を伴わない軽微な修正に特化。issue/PR は不要で、branch + commit 後にユーザーが main へ merge する。scope が広がった場合は task へ移行する。
- `docs-sync.md`: git diff を事実として docs を最小更新し、draft PR を公開する。HARD STOP 時は `/init-docs` を要求して終了する。
- `init-docs.md`: repository の実態把握と設計ドキュメント再構築を行う重い初期化。docs-sync で説明不能になった場合に使用する。
- `new-issue.md`: 漠然とした要望を issue に整形する任意の pre-work entrypoint。実装は行わない。

通常作業は `/work`、PR review comment 対応は `/review-resolve` を使用する。

## Repository Constraints

- Backend/frontend は loopback bind を維持する。
- action 追加時は `backend/tmux_dashboard/config.py`、`actions.py`、route/test/docs を同時に確認する。
- stdout/stderr や未マスク secret を API response に追加しない。
- launchd runtime の source of truth は `launchd/templates/` であり、生成済み file を直接編集しない。
- npm を使う場合は最初に `npm --version` を実行する。
- repository 変更は定義済み workflow を経由し、破壊的 git 操作を行わない。
