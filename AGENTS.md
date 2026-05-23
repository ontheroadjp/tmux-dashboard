# AGENTS

## Custom / Command の使い分け（AI向けルール）

- init-docs.md: repo の実態把握と設計ドキュメント再構築。重い初期化。
- docs-sync.md: 実装差分に追随する軽量同期。HARD STOP 時は /init-docs を要求して終了する。
- task.md: 実装と docs 整合を段階的に完了し、main 取り込みまで行う標準フロー。
- refactor.md: 構造的負債を安全に解消する専用フロー。再開ルール・測定ルール・docs同期ルールを含む。
- security.md: 攻撃者視点で脆弱性を洗い出し、修正と回帰検証まで行う専用フロー。
- performance.md: 計測根拠ベースで性能改善を行い、回帰検証と改善率を明示する専用フロー。

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: add a lesson comment to the relevant GitHub Issue
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Create a GitHub Issue with checkable task items (`gh issue create`)
2. **Verify Plan**: Check in with the user before starting implementation
3. **Track Progress**: Update the Issue body as items complete (`gh issue edit`)
4. **Explain Changes**: High-level summary at each step as Issue comments (`gh issue comment`)
5. **Document Results**: Close the Issue with a summary comment when done (`gh issue close --comment`)
6. **Capture Lessons**: Add a comment to the Issue summarizing what went wrong and how to avoid it

## Branch Policy

- 作業は必ず main から branch を切って開始する。main への直接コミットは禁止
- branch 名は `<type>/<short-description>` 形式。例: `feat/login-rate-limit`, `fix/pane-detail-404`
- 作業完了後は PR を作成し、main へのマージは PR 経由のみとする

## Commit Policy

- コミットメッセージは [Conventional Commits](https://www.conventionalcommits.org/) に従う
- フォーマット: `<type>(<scope>): <summary>`
  - `type`: `feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `ci` / `perf`
  - `scope`: 変更対象（任意）。例: `backend`, `frontend`, `auth`, `actions`
  - `summary`: 英語・命令形・小文字始まり・句点なし
- Breaking change は `!` を type の後に付ける。例: `feat!: drop Python 3.10 support`
- 1コミット1責務。複数の独立した変更は分けてコミットする

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
