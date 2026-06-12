# Repository Structure

## 構成

このリポジトリは単一プロダクトを frontend、backend、macOS runtime、VPS ingress に分けた構成であり、独立 package を共有する一般的な `apps/` / `packages/` 型モノレポではない。

根拠: top-level tracked files、`frontend/package.json`, `backend/requirements.txt`

| パス | 責務 | 実装根拠 |
|---|---|---|
| `backend/` | Flask API、認証、tmux action、状態収集、pytest | `backend/tmux_dashboard/app.py:12-26`, `backend/tests/` |
| `frontend/` | Next.js App Router UI と backend proxy Route Handler | `frontend/app/page.tsx`, `frontend/app/pane/[paneId]/page.tsx`, `frontend/app/api/` |
| `launchd/` | macOS LaunchAgent template、runtime file renderer、start/stop/status 操作 | `launchd/render-prod-files.sh:4-24`, `launchd/templates/`, `launchd/restart-prod.sh` |
| `tunnel/` | autossh の dev/prod env template | `tunnel/.env.dev.example`, `tunnel/.env.prod.example` |
| `server/` | VPS Nginx と tunnel の公開用 example 設定 | `server/nginx/tunnel.starton.jp.conf.example`, `server/tunnel.example.conf` |
| `scripts/` | bootstrap、read-only doctor、test、monitor | `scripts/bootstrap.sh`, `scripts/doctor.sh`, `scripts/test.sh`, `scripts/monitor.sh` |
| `.github/workflows/` | backend/frontend CI と server config deploy | `.github/workflows/ci.yml`, `.github/workflows/deploy-server-config.yml` |
| `docs/L0_concept/` | 目的、WHY、設計ポリシー | `docs/L0_concept/concept.md`, `docs/L0_concept/policy.md` |
| `docs/L1_project/` | プロジェクト全体像と repository 責務 | 本ファイル、`docs/L1_project/project_overview.md` |
| `docs/L2_development/` | 開発、運用、CI、test、整合性確認 | `docs/L2_development/` |
| `docs/L3_implementation/` | API と実装仕様 | `docs/L3_implementation/` |
| `docs/manual/` | mTLS、CRL、launchd、障害対応の詳細 runbook | `docs/manual/runbook.md` |

## Backend 内部

| パス | 責務 | 根拠 |
|---|---|---|
| `backend/run.py` | Flask development server entrypoint | `backend/run.py:3-10` |
| `backend/tmux_dashboard/app.py` | application factory と依存注入 | `backend/tmux_dashboard/app.py:12-26` |
| `backend/tmux_dashboard/config.py` | env file 読込と typed config | `backend/tmux_dashboard/config.py:21-120` |
| `backend/tmux_dashboard/auth.py` | token 発行・検証と login rate limit | `backend/tmux_dashboard/auth.py:12-55` |
| `backend/tmux_dashboard/routes.py` | HTTP endpoint と認証境界 | `backend/tmux_dashboard/routes.py:62-182` |
| `backend/tmux_dashboard/collectors.py` | tmux、ps、lsof の read 処理 | `backend/tmux_dashboard/collectors.py:27-336` |
| `backend/tmux_dashboard/actions.py` | tmux write 操作の dispatch | `backend/tmux_dashboard/actions.py:9-163` |
| `backend/tests/` | route、action、collector の pytest | `backend/tests/test_app.py`, `backend/tests/test_actions.py`, `backend/tests/test_collectors.py` |

## Frontend 内部

| パス | 責務 | 根拠 |
|---|---|---|
| `frontend/app/page.tsx` | login と dashboard top page | `frontend/app/page.tsx:37-220` |
| `frontend/app/pane/[paneId]/page.tsx` | pane detail と action UI | `frontend/app/pane/[paneId]/page.tsx` |
| `frontend/app/api/` | backend proxy と cookie session | `frontend/app/api/_shared.ts`, `frontend/app/api/auth/login/route.ts` |
| `frontend/lib/api.ts` | browser-side API client と型定義 | `frontend/lib/api.ts:1-190` |
| `frontend/lib/theme.ts` | MUI theme | `frontend/lib/theme.ts` |
| `frontend/lib/titleIcon.tsx` | pane title に応じた icon 選択 | `frontend/lib/titleIcon.tsx` |

## 追跡対象と生成物

`launchd/templates/*.tmpl` は追跡対象であり、`launchd/render-prod-files.sh` が checkout 固有の絶対パスを埋めた start script と plist を生成する。生成物、env、log、build artifact、dependency directory は `.gitignore` 対象である。

根拠: `launchd/render-prod-files.sh:4-24`, `.gitignore:21-76`

## 未確認事項

- `docs/manual/client-cert-dashboard-requirements.md` と `tmp/` の原資料との生成関係。理由: 自動生成スクリプトがない。確認先: 文書作成履歴または生成ツール定義。
