# tmux-dashboard

## Backend (Flask)

```bash
cd backend
python3 -m pip install -r requirements.txt
python3 run.py
```

Backend API endpoint: `http://127.0.0.1:5001`

## Frontend (Next.js)

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE=http://127.0.0.1:5001 npm run dev
```

Frontend endpoint: `http://127.0.0.1:3000`

## Action Scope Configuration

Set `DASHBOARD_ALLOWED_ACTIONS` on backend startup.

- `all` (default): all implemented actions are enabled
- comma list: enable only selected actions

Example:

```bash
DASHBOARD_ALLOWED_ACTIONS=send_keys,select_window python3 run.py
```
