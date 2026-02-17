# tmux-dashboard

## Backend (Flask)

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python run.py
```

Backend API endpoint: `http://127.0.0.1:5001`

Auth environment variables (backend):
- `DASHBOARD_AUTH_USER` (required)
- `DASHBOARD_AUTH_PASSWORD` (required)
- `DASHBOARD_AUTH_SECRET` (optional: if omitted, a random secret is auto-generated at process start)
- `DASHBOARD_AUTH_TOKEN_TTL_SEC` (default: `86400`)

### Backend restart procedure (when auth settings are changed)

```bash
pkill -f "backend/run.py" || true
# Stop all processes that are still listening on 5001 (if any)
PIDS=$(lsof -tiTCP:5001 -sTCP:LISTEN || true)
[ -n "$PIDS" ] && kill $PIDS || true

# Must be empty before restart
lsof -nP -iTCP:5001 -sTCP:LISTEN || true

cd backend
DASHBOARD_AUTH_USER=admin DASHBOARD_AUTH_PASSWORD=hogehoge ./venv/bin/python run.py
```

- If you use auto-generated secret (no `DASHBOARD_AUTH_SECRET`), previously issued tokens become invalid after restart.
- If you set fixed `DASHBOARD_AUTH_SECRET`, previously issued tokens remain valid until token expiry.
- After restart, logout once in browser (or delete `tmux_dashboard_token` cookie) before login retest.

Direct login check:

```bash
curl -i -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"admin","password":"admin"}'

curl -i -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"admin","password":"hogehoge"}'
```

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend endpoint: `http://127.0.0.1:4000`

Login flow:
- Open frontend and login from the UI
- Frontend stores backend bearer token in `HttpOnly` cookie via `/api/auth/login`
- `/api/snapshot` and `/api/actions/*` are proxied from Next.js to backend with `Authorization: Bearer <token>`
- Top page does not show Actions; click a pane to open `/pane/[paneId]`
- Pane detail page shows pane metadata, current pane output, and pane-targeted Actions

Default API resolution:
- `NEXT_PUBLIC_API_BASE` is set: use that value directly from browser
- not set: use same-origin Next.js API routes (`/api/*`) and proxy to backend
- proxy destination default: `http://127.0.0.1:5001` (`BACKEND_API_BASE` で変更可能)

Example (when backend is not local 127.0.0.1):

```bash
cd frontend
BACKEND_API_BASE=http://<backend-host>:5001 npm run dev
```

## Action Scope Configuration

Set `DASHBOARD_ALLOWED_ACTIONS` on backend startup.

- `all` (default): all implemented actions are enabled
- comma list: enable only selected actions

Example:

```bash
DASHBOARD_ALLOWED_ACTIONS=send_keys,select_window ./venv/bin/python run.py
```
