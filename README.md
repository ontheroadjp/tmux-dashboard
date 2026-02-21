# tmux-dashboard

## Backend (Flask)

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
cp .env.dev.example .env.dev
./venv/bin/python run.py
```

Backend API endpoint (dev default): `http://127.0.0.1:5001`
Backend API endpoint (prod): `http://127.0.0.1:10323`

Auth environment variables (backend):
- `DASHBOARD_AUTH_USER` (required)
- `DASHBOARD_AUTH_PASSWORD` (required)
- `DASHBOARD_AUTH_SECRET` (optional: if omitted, a random secret is auto-generated at process start)
- `DASHBOARD_AUTH_TOKEN_TTL_SEC` (default: `86400`)
- `DASHBOARD_DEBUG` (`1` for development, `0` for production)
- `DASHBOARD_CORS_ORIGINS` (comma-separated allowed origins; no CORS headers if unset)

Recommended env files:
- development: `backend/.env.dev` (copy from `backend/.env.dev.example`)
- production (launchd): `backend/.env.prod` (copy from `backend/.env.prod.example`)

### Backend restart procedure (when auth settings are changed)

```bash
pkill -f "backend/run.py" || true
# Stop all processes that are still listening on 5001 (if any)
PIDS=$(lsof -tiTCP:5001 -sTCP:LISTEN || true)
[ -n "$PIDS" ] && kill $PIDS || true

# Must be empty before restart
lsof -nP -iTCP:5001 -sTCP:LISTEN || true

cd backend
./venv/bin/python run.py
```

- If you use auto-generated secret (no `DASHBOARD_AUTH_SECRET`), previously issued tokens become invalid after restart.
- If you set fixed `DASHBOARD_AUTH_SECRET`, previously issued tokens remain valid until token expiry.
- After restart, logout once in browser (or delete `tmux_dashboard_token` cookie) before login retest.

Direct login check:

```bash
curl -i -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"<AUTH_USER>","password":"<AUTH_PASSWORD>"}'

curl -i -X POST http://127.0.0.1:5001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"user":"<AUTH_USER>","password":"<AUTH_PASSWORD>"}'
```

## Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.dev.example .env.dev
npm run dev
```

Frontend endpoint (dev): `http://127.0.0.1:4000`
Frontend endpoint (prod): `http://127.0.0.1:10322`

Login flow:
- Open frontend and login from the UI
- Frontend stores backend bearer token in `HttpOnly` cookie via `/api/auth/login`
- `/api/snapshot` and `/api/actions/*` are proxied from Next.js to backend with `Authorization: Bearer <token>`
- Top page does not show Actions; click a pane to open `/pane/[paneId]`
- Pane detail page shows pane metadata, current pane output, and pane-targeted Actions

Default API resolution:
- `NEXT_PUBLIC_API_BASE` is set: use that value directly from browser
- not set: use same-origin Next.js API routes (`/api/*`) and proxy to backend
- proxy destination default:
  - dev (`NODE_ENV=development`): `http://127.0.0.1:5001`
  - prod (`NODE_ENV=production`): `http://127.0.0.1:10323`
  - `BACKEND_API_BASE` で上書き可能

Example (when backend is not local 127.0.0.1):

```bash
cd frontend
cp .env.dev.example .env.dev
# edit BACKEND_API_BASE in .env.dev
npm run dev
```

## Action Scope Configuration

Set `DASHBOARD_ALLOWED_ACTIONS` on backend startup.

- `all` (default): all implemented actions are enabled
- comma list: enable only selected actions

Example:

```bash
DASHBOARD_ALLOWED_ACTIONS=send_keys,select_window ./venv/bin/python run.py
```
