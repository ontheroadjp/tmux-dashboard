# Project Overview

## 目的

tmux-dashboard は、macOS 上の tmux と関連するネットワーク状態を Web UI で表示し、認証済み利用者に許可された tmux 操作を提供する。

根拠: `README.md:1-30`, `backend/tmux_dashboard/routes.py:128-182`

## 技術スタック

| レイヤ | 技術 | 確認根拠 |
|---|---|---|
| Backend runtime | Python 3.12（CI） | `.github/workflows/ci.yml:16-25` |
| Backend framework | Flask 3.1.3 | `backend/requirements.txt:1` |
| Token signing | itsdangerous 2.2.0 | `backend/requirements.txt:2`, `backend/tmux_dashboard/auth.py:7-38` |
| Production WSGI | gunicorn 22.0.0 | `backend/requirements.txt:4`, `launchd/templates/start-backend-prod.sh.tmpl:20-31` |
| Frontend runtime | Node.js 20（CI） | `.github/workflows/ci.yml:34-44` |
| Frontend framework | Next.js 15.5.18 / React 19.0.0 | `frontend/package-lock.json:packages["node_modules/next"].version`, `frontend/package-lock.json:packages["node_modules/react"].version` |
| UI | MUI 7.0.2 / Emotion | `frontend/package.json:11-16` |
| Language/checker | TypeScript 5.8.2 strict mode | `frontend/package.json:21-25`, `frontend/tsconfig.json:2-16` |
| Package managers | npm / pip | `frontend/package-lock.json:1-6`, `backend/requirements.txt:1-4` |
| Process management | macOS launchd | `launchd/templates/*.plist.tmpl` |
| External ingress | autossh reverse tunnel + Nginx mTLS | `launchd/templates/start-tunnel-prod.sh.tmpl:21-34`, `server/nginx/tunnel.starton.jp.conf.example:31-114` |

## 主要機能

- tmux session/window/pane の階層状態と pane process 情報を収集する。根拠: `backend/tmux_dashboard/collectors.py:37-154`
- listening TCP server、SSH process、SSH tunnel 候補を収集する。根拠: `backend/tmux_dashboard/collectors.py:157-207`
- pane の metadata と直近 200 行の出力を取得する。根拠: `backend/tmux_dashboard/collectors.py:210-226`, `backend/tmux_dashboard/collectors.py:319-336`
- `send_keys`、選択、削除、window 作成、pane 分割を実行する。根拠: `backend/tmux_dashboard/actions.py:48-163`
- login、session 検証、snapshot、pane detail、action API を提供する。根拠: `backend/tmux_dashboard/routes.py:82-182`
- Next.js が Bearer token を HttpOnly cookie に変換し、same-origin API として backend を中継する。根拠: `frontend/app/api/auth/login/route.ts:43-55`, `frontend/app/api/_shared.ts:11-20`
- dashboard と pane detail は 3 秒 polling で状態を更新する。根拠: `frontend/app/page.tsx:35`, `frontend/app/page.tsx:77-86`, `frontend/app/pane/[paneId]/page.tsx`
- bootstrap、診断、テスト、monitor、launchd 操作を shell script で提供する。根拠: `scripts/bootstrap.sh`, `scripts/doctor.sh`, `scripts/test.sh`, `scripts/monitor.sh`, `launchd/*.sh`

## システム構成

```text
Browser
  -> HTTPS + mTLS
VPS Nginx
  -> autossh reverse tunnel
Next.js (127.0.0.1:10322 prod / :4000 dev)
  -> HTTP
Flask (127.0.0.1:10323 prod / :5001 dev)
  -> tmux / ps / lsof
macOS
```

production port の根拠: `launchd/templates/start-frontend-prod.sh.tmpl:28-34`, `launchd/templates/start-backend-prod.sh.tmpl:25-31`, `launchd/templates/start-tunnel-prod.sh.tmpl:21-34`

development port の根拠: `frontend/package.json:scripts.dev`, `backend/run.py:7-10`

## 未確認事項

- production VPS の実ファイルは `.gitignore` 対象であり、tracked file からは確認できない。確認先: VPS の `/etc/nginx/sites-available/` と生成済み local config。
- 実運用中の Node.js/Python patch version。CI の major/minor は確定するが、local launchd runtime は環境依存。確認先: `node --version`, `python3 --version`。
