# Consistency Checks

## 目的

実装、CI、運用 template、公開ドキュメントのずれを変更時に検出する。CI 定義を test/build command の最優先事実とし、runtime は tracked template を正とする。

根拠: `.github/workflows/ci.yml`, `launchd/render-prod-files.sh:4-24`

## 必須確認

### Backend

```bash
cd backend
./venv/bin/pytest -q
```

route、認証、action、collector の変更では対応する `backend/tests/` を確認する。

根拠: `.github/workflows/ci.yml:19-25`, `backend/tests/`

### Frontend

```bash
cd frontend
npm run typecheck
npm run build
```

CI と同じ command を実行する。frontend unit/E2E test command は現在存在しない。

根拠: `.github/workflows/ci.yml:39-44`, `frontend/package.json:scripts`

### Shell

変更した shell script と template script に `bash -n` を実行する。

```bash
bash -n scripts/*.sh launchd/*.sh launchd/templates/*.sh.tmpl
```

tracked shell は Bash と `set -euo pipefail` を使用する。

根拠: `scripts/test.sh:1-2`, `launchd/render-prod-files.sh:1-2`, `launchd/templates/start-backend-prod.sh.tmpl:1-2`

### Runtime 生成

`launchd/templates/` または renderer を変更した場合:

```bash
./launchd/render-prod-files.sh
./scripts/doctor.sh
```

生成物は Git diff の対象にせず、template と renderer の差分を確認する。

根拠: `launchd/render-prod-files.sh:15-24`, `.gitignore:45-56`

### API

- Flask route と `docs/L3_implementation/api.md` を突合する。
- Next.js Route Handler が同じ method/path を中継することを確認する。
- action 追加時は `DEFAULT_ACTIONS`、`ACTION_HANDLERS`、test、API docs を同時に確認する。

根拠: `backend/tmux_dashboard/routes.py:82-182`, `frontend/app/api/`, `backend/tmux_dashboard/config.py:8-18`, `backend/tmux_dashboard/actions.py:146-163`

### Configuration

- tracked `.env.*.example` と `load_config()` の key を突合する。
- production 必須値は start template と backend validation の両方を確認する。
- secret を docs、log、tracked file に記載しない。

根拠: `backend/tmux_dashboard/config.py:45-120`, `backend/.env.prod.example`, `launchd/templates/start-backend-prod.sh.tmpl:14-18`, `.gitignore:57-66`

## Documentation

- command は `docs/.ai/repo.profile.json` と実 script/package definition の双方に存在すること。
- path は tracked file または明示された生成物であること。
- L0 は設計方針変更時のみ更新し、実装差分の追従は L1-L3 で行う。
- `git diff` を事実として README、L1-L3、manual の更新要否を判断する。

## 未確認事項

- shellcheck、ruff、mypy、frontend formatter/linter の採用方針。理由: CI と package/config に定義がない。確認先: 将来追加される workflow と tool config。
