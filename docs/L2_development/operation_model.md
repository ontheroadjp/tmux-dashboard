# Operation Model

## 前提

- Python 3。CI は Python 3.12 を使用する。根拠: `.github/workflows/ci.yml:16-25`
- Node.js と npm。CI は Node.js 20 と `npm ci` を使用する。根拠: `.github/workflows/ci.yml:34-44`
- tmux。collector と action が CLI を実行する。根拠: `backend/tmux_dashboard/collectors.py:58-95`, `backend/tmux_dashboard/actions.py:9-17`
- macOS production には autossh と macOS launchd が必要。根拠: `launchd/templates/start-tunnel-prod.sh.tmpl:10-34`, `launchd/templates/*.plist.tmpl`
- Linux production には systemd user service が必要。根拠: `systemd/templates/`, `systemd/install.sh`

## 初期セットアップ

推奨入口:

```bash
./scripts/bootstrap.sh
```

既存 env を上書きせず、不足 env の作成、backend venv/dependency、frontend dependency、launchd runtime file の生成を行う。service の start/stop/reload は行わない。frontend build も必要な場合は `./scripts/bootstrap.sh --build` を使う。

根拠: `scripts/bootstrap.sh:8-20`, `scripts/bootstrap.sh:58-125`

手動セットアップ:

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt

cd ../frontend
npm install

cd ..
cp backend/.env.dev.example backend/.env.dev
cp frontend/.env.dev.example frontend/.env.dev
```

根拠: `scripts/bootstrap.sh:73-108`, `backend/requirements.txt`, `frontend/package.json`

## Development

通常の frontend 開発:

```bash
cd frontend
npm run dev
```

`frontend/.env.dev` の `BACKEND_API_BASE` で backend を選択する。template の既定は `http://127.0.0.1:5001` である。

根拠: `frontend/package.json:scripts.dev`, `frontend/.env.dev.example:1-7`

backend も開発起動する場合:

```bash
cd backend
./venv/bin/python run.py
```

Flask は既定で `127.0.0.1:5001` に bind する。

根拠: `backend/run.py:7-10`

## Build And Test

```bash
./scripts/test.sh
./scripts/test.sh backend
./scripts/test.sh frontend
```

全体 test は backend pytest、frontend typecheck、frontend build の順で実行する。

根拠: `scripts/test.sh:17-55`

個別 command:

```bash
cd backend && ./venv/bin/pytest -q
cd frontend && npm run typecheck
cd frontend && npm run build
```

根拠: `.github/workflows/ci.yml:24-25`, `.github/workflows/ci.yml:41-44`

## Command Inventory

`docs/.ai/repo.profile.json` の command は以下の実体に対応する。

| Profile key | Command | 実体 |
|---|---|---|
| `backend:install` | `cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt` | `scripts/bootstrap.sh:82-97` |
| `backend:run` | `cd backend && ./venv/bin/python run.py` | `backend/run.py:7-10` |
| `backend:test` | `cd backend && ./venv/bin/pytest -q` | `.github/workflows/ci.yml:24-25` |
| `frontend:install` | `cd frontend && npm install` | `scripts/bootstrap.sh:99-108` |
| `frontend:install:ci` | `cd frontend && npm ci` | `.github/workflows/ci.yml:39-40` |
| `frontend:dev` | `cd frontend && npm run dev` | `frontend/package.json:scripts.dev` |
| `frontend:build` | `cd frontend && npm run build` | `frontend/package.json:scripts.build` |
| `frontend:start` | `cd frontend && npm run start` | `frontend/package.json:scripts.start` |
| `frontend:restart` | `cd frontend && npm run restart` | `frontend/package.json:scripts.restart` |
| `frontend:typecheck` | `cd frontend && npm run typecheck` | `frontend/package.json:scripts.typecheck` |
| `test` | `./scripts/test.sh` | `scripts/test.sh:46-50` |
| `test:backend` | `./scripts/test.sh backend` | `scripts/test.sh:51-53` |
| `test:frontend` | `./scripts/test.sh frontend` | `scripts/test.sh:54-56` |
| `bootstrap` | `./scripts/bootstrap.sh` | `scripts/bootstrap.sh` |
| `bootstrap:build` | `./scripts/bootstrap.sh --build` | `scripts/bootstrap.sh:26-30`, `scripts/bootstrap.sh:116-125` |
| `doctor` | `./scripts/doctor.sh` | `scripts/doctor.sh` |
| `doctor:logs` | `./scripts/doctor.sh --logs` | `scripts/doctor.sh:19-24`, `scripts/doctor.sh:195-203` |
| `monitor` | `./scripts/monitor.sh` | `scripts/monitor.sh` |
| `launchd:render` | `./launchd/render-prod-files.sh` | `launchd/render-prod-files.sh` |
| `launchd:status` | `./launchd/status-prod.sh` | `launchd/status-prod.sh` |
| `launchd:restart` | `./launchd/restart-prod.sh all` | `launchd/restart-prod.sh:15-20` |
| `launchd:stop` | `./launchd/stop-prod.sh all` | `launchd/stop-prod.sh:16-21` |

## Production

### macOS (launchd)

1. dependency と frontend build を準備する。
2. `backend/.env.prod`、`frontend/.env.prod`、`tunnel/.env.prod` を作成する。
3. `./launchd/render-prod-files.sh` で runtime file を生成する。
4. plist を `~/Library/LaunchAgents/` へ配置して load する。

詳細手順: `launchd/README.md:40-118`

production endpoint:

- frontend: `127.0.0.1:10322`
- backend: `127.0.0.1:10323`
- autossh remote port: 既定 `10322`

根拠: `launchd/templates/start-frontend-prod.sh.tmpl:28-34`, `launchd/templates/start-backend-prod.sh.tmpl:25-31`, `launchd/templates/start-tunnel-prod.sh.tmpl:21-34`

### Linux (systemd + Tailscale)

1. dependency と frontend build を準備する。
2. `backend/.env.prod` を作成する。
3. `bash systemd/install.sh` で unit file を生成・有効化する。

```bash
cd frontend && npm run build
cd ..
bash systemd/install.sh
systemctl --user start tmux-dashboard-backend tmux-dashboard-frontend
```

production endpoint:

- frontend: `127.0.0.1:4000`
- backend: `127.0.0.1:10323`
- 外部アクセス: Tailscale serve（`tailscale serve http://localhost:4000`）

根拠: `systemd/templates/tmux-dashboard-frontend.service.tmpl`, `systemd/templates/tmux-dashboard-backend.service.tmpl`

## 診断と操作

```bash
./scripts/doctor.sh
./scripts/doctor.sh --logs
./scripts/monitor.sh
./launchd/status-prod.sh
./launchd/restart-prod.sh all
./launchd/stop-prod.sh all
```

`doctor.sh` は read-only 診断である。`monitor.sh` は port、launchd、build、env の状態を表示する。restart/stop は launchd state を変更する。

根拠: `scripts/doctor.sh:8-16`, `scripts/monitor.sh:154-214`, `launchd/restart-prod.sh:10-39`, `launchd/stop-prod.sh:10-40`

## 未確認事項

- container や他 OS 向けの production runtime 定義。理由: 現時点では macOS launchd と Linux systemd のみ定義されている。
