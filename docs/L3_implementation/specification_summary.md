# Specification Summary

## Backend Composition

`create_app()` は config を読み、`AuthService` を生成し、collector/action 関数を `register_routes()` へ注入する。test ではこの境界を差し替えられる。

根拠: `backend/tmux_dashboard/app.py:12-26`, `backend/tmux_dashboard/routes.py:62-71`

### Configuration

`load_config()` は `DASHBOARD_ENV_FILE` を優先し、未指定なら `DASHBOARD_ENV=prod` で `.env.prod`、それ以外で `.env.dev` を読む。既存 process env は env file より優先される。

根拠: `backend/tmux_dashboard/config.py:45-63`

主要設定:

| Key | 仕様 | 根拠 |
|---|---|---|
| `DASHBOARD_ALLOWED_ACTIONS` | `all` または空で全 default action、その他は comma-separated | `backend/tmux_dashboard/config.py:66-72` |
| `DASHBOARD_AUTH_USER/PASSWORD` | 必須 | `backend/tmux_dashboard/config.py:74-78` |
| `DASHBOARD_AUTH_SECRET` | prod では既定で必須、dev は未指定時に process 単位で生成 | `backend/tmux_dashboard/config.py:79-89` |
| `DASHBOARD_AUTH_TOKEN_TTL_SEC` | 既定 86400、最小 60 | `backend/tmux_dashboard/config.py:90-120` |
| `DASHBOARD_CORS_ORIGINS` | comma-separated allowlist | `backend/tmux_dashboard/config.py:99-104` |
| login limit/window/lock | 既定 5 回 / 600 秒 / 900 秒 | `backend/tmux_dashboard/config.py:105-120` |

### Authentication

token payload は `{"sub": user}` で、itsdangerous の timed serializer が署名と期限検証を行う。login failure と lock は client IP key の process memory に保存する。

根拠: `backend/tmux_dashboard/auth.py:12-55`

### Collectors

- tmux session/window/pane を tab-separated format で取得し、nested JSON を構築する。根拠: `backend/tmux_dashboard/collectors.py:58-154`
- pane PID を `ps` で補完し、sensitive text を `[REDACTED]` へ置換する。根拠: `backend/tmux_dashboard/collectors.py:9-55`
- `lsof` と `ps` から listening server、SSH connection、tunnel 候補を取得する。根拠: `backend/tmux_dashboard/collectors.py:157-207`
- pane detail は direct metadata lookup を試し、失敗時は snapshot search へ fallback する。出力は直近 200 行を capture する。根拠: `backend/tmux_dashboard/collectors.py:210-336`

### Actions

対応 action:

`send_keys`, `select_pane`, `select_window`, `switch_client`, `kill_pane`, `kill_window`, `kill_session`, `new_window`, `split_window`

根拠: `backend/tmux_dashboard/actions.py:146-156`

`send_keys` の `keys=["-l", text]` は tmux literal mode として option を target より前に配置する。

根拠: `backend/tmux_dashboard/actions.py:48-65`

subprocess timeout は 5 秒で、timeout と一般 failure を code で区別する。

根拠: `backend/tmux_dashboard/actions.py:6-40`

## Frontend Composition

### Session Proxy

browser は既定で same-origin `/api` を呼ぶ。login Route Handler は backend token を `tmux_dashboard_token` cookie に保存し、以降の handler は Bearer header に変換する。

根拠: `frontend/lib/api.ts:1-16`, `frontend/app/api/auth/login/route.ts:43-55`, `frontend/app/api/_shared.ts:11-20`

backend base URL は `BACKEND_API_BASE` を優先し、未設定時は development `127.0.0.1:5001`、production `127.0.0.1:10323` である。

根拠: `frontend/app/api/_shared.ts:3-4`

### Dashboard

初回に session を確認し、未認証時は login form を表示する。認証後は 3 秒ごとに snapshot を更新し、session/window/pane と network state を表示する。

根拠: `frontend/app/page.tsx:35-86`, `frontend/app/page.tsx:174-220`

### Pane Detail

pane detail page は pane metadata/output を表示し、許可された action を選択中 pane に対して送信する。入力 focus 中は polling を抑止する。

根拠: `frontend/app/pane/[paneId]/page.tsx`

## Runtime

**macOS (launchd):** production backend は gunicorn で `127.0.0.1:10323`、frontend は Next.js で `127.0.0.1:10322` に bind する。autossh は VPS port 10322 を local frontend 10322 へ reverse forward する。

根拠: `launchd/templates/start-backend-prod.sh.tmpl:25-31`, `launchd/templates/start-frontend-prod.sh.tmpl:28-34`, `launchd/templates/start-tunnel-prod.sh.tmpl:21-34`

**Linux (systemd):** production backend は gunicorn で `127.0.0.1:10323`、frontend は Next.js で `127.0.0.1:4000` に bind する。外部アクセスは Tailscale serve が担う。

根拠: `systemd/templates/tmux-dashboard-backend.service.tmpl`, `systemd/templates/tmux-dashboard-frontend.service.tmpl`

## Data Model

永続 database model はない。API response の中心は runtime snapshot であり、session -> windows -> panes の nested structure と network collections を持つ。

根拠: `backend/tmux_dashboard/collectors.py:97-154`, `frontend/lib/api.ts:17-59`

## 未確認事項

- frontend action UI が backend の全 action を操作可能にするか。理由: backend dispatch と UI の control set は独立している。確認先: `frontend/app/pane/[paneId]/page.tsx` と `backend/tmux_dashboard/actions.py`。
- browser の reconnect/offline UX。理由: polling error 表示はあるが要件文書がない。確認先: `frontend/app/page.tsx`, `frontend/app/pane/[paneId]/page.tsx`。
