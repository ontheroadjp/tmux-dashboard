# tmux-dashboard

## Backend (Flask)

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python run.py
```

Backend API endpoint: `http://127.0.0.1:5001`

## Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend endpoint: `http://127.0.0.1:4000`

Default API resolution:
- `NEXT_PUBLIC_API_BASE` is set: use that value
- not set: use `http(s)://<current-host>:5001`

## Action Scope Configuration

Set `DASHBOARD_ALLOWED_ACTIONS` on backend startup.

- `all` (default): all implemented actions are enabled
- comma list: enable only selected actions

Example:

```bash
DASHBOARD_ALLOWED_ACTIONS=send_keys,select_window ./venv/bin/python run.py
```
