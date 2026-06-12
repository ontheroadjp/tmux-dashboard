# API

## 通信モデル

browser は通常 Next.js の same-origin `/api/*` を呼び、Route Handler が Flask の同名 endpoint へ中継する。認証 token は browser では HttpOnly cookie、Flask への request では `Authorization: Bearer` header として扱う。

根拠: `frontend/lib/api.ts:1-16`, `frontend/app/api/_shared.ts:11-20`

## Endpoints

| Method | Flask path | 認証 | 成功 response | 根拠 |
|---|---|---|---|---|
| GET | `/api/health` | 不要 | `{"ok": true}` | `backend/tmux_dashboard/routes.py:82-84` |
| POST | `/api/auth/login` | 不要 | token、type、expiry、user | `backend/tmux_dashboard/routes.py:86-114` |
| GET | `/api/auth/session` | Bearer | authenticated、user | `backend/tmux_dashboard/routes.py:116-122` |
| POST | `/api/auth/logout` | 実質不要 | `{"ok": true}` | `backend/tmux_dashboard/routes.py:124-126` |
| GET | `/api/snapshot` | Bearer | tmux、network、allowed_actions | `backend/tmux_dashboard/routes.py:128-140` |
| GET | `/api/panes/<pane_id>` | Bearer | session、window、pane、output | `backend/tmux_dashboard/routes.py:142-152` |
| POST | `/api/actions/<action>` | Bearer | tmux action result | `backend/tmux_dashboard/routes.py:154-182` |
| OPTIONS | `/api/actions/<action>` | 不要 | 204 | `backend/tmux_dashboard/routes.py:154-157` |

## Authentication

### Login Request

```json
{
  "user": "string",
  "password": "string"
}
```

invalid credentials は 401、IP lock 中は 429。Next.js login handler は `X-Forwarded-For` と `X-Real-IP` を backend へ転送し、成功 token を cookie に保存する。

根拠: `backend/tmux_dashboard/routes.py:86-114`, `frontend/app/api/auth/login/route.ts:4-55`

### Cookie

- name: `tmux_dashboard_token`
- HttpOnly
- production のみ Secure
- SameSite Lax
- path `/`
- max age は backend expiry、最低 60 秒

根拠: `frontend/app/api/_shared.ts:5`, `frontend/app/api/auth/login/route.ts:49-55`

logout は backend call の成否にかかわらず cookie を削除する。backend 自体は server-side revocation list を持たない。

根拠: `frontend/app/api/auth/logout/route.ts:4-28`, `backend/tmux_dashboard/routes.py:124-126`

## Snapshot Response

```json
{
  "tmux": {
    "available": true,
    "running": true,
    "sessions": []
  },
  "network": {
    "listening_servers": [],
    "ssh_connections": [],
    "ssh_tunnels": []
  },
  "allowed_actions": []
}
```

詳細型の根拠: `frontend/lib/api.ts:17-59`, collector の生成根拠: `backend/tmux_dashboard/collectors.py:58-207`

## Pane Detail Response

```json
{
  "ok": true,
  "session": {},
  "window": {},
  "pane": {},
  "output": "string"
}
```

pane が存在しない場合は 404。

根拠: `backend/tmux_dashboard/routes.py:142-152`, `backend/tmux_dashboard/collectors.py:319-336`

## Action Request

action ごとの payload:

| Action | Payload |
|---|---|
| `send_keys` | `target_pane`, `keys` |
| `select_pane` | `target_pane` |
| `select_window` | `target_window` |
| `switch_client` | `target_session` |
| `kill_pane` | `target_pane` |
| `kill_window` | `target_window` |
| `kill_session` | `target_session` |
| `new_window` | optional `target_session`, `window_name`, `command` |
| `split_window` | optional `target_pane`, `direction`, `percentage`, `command` |

根拠: `backend/tmux_dashboard/actions.py:48-143`

許可外 action は 403。tmux 実行失敗は 400 と `{ok:false,error:"action failed",code}` を返し、stdout/stderr は response に含めない。

根拠: `backend/tmux_dashboard/routes.py:163-178`

## CORS And Client IP

`DASHBOARD_CORS_ORIGINS` が設定され、request Origin が allowlist と一致する場合だけ CORS header を付与する。client IP の proxy header は Flask の direct peer が loopback の場合だけ利用し、`X-Real-IP` を優先する。

根拠: `backend/tmux_dashboard/routes.py:19-46`

## 未確認事項

- API versioning 方針。理由: path に version がなく、互換性ポリシー文書もない。確認先: 将来の API policy。
- OpenAPI schema。理由: schema file と生成設定がない。確認先: repository へ追加される OpenAPI 定義。
