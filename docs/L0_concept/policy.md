# Policy

## 技術選定ポリシー

### Backend

Flask の application factory で設定、認証、collector、action を組み合わせる。tmux と OS コマンドを直接呼び出す小規模 API であり、DB や ORM は導入していない。本番は gunicorn、開発は Flask development server を使う。

なぜ: HTTP API とローカル CLI の橋渡しに責務を限定し、永続化レイヤを持たない構成を維持するため。

根拠: `backend/tmux_dashboard/app.py:12-26`, `backend/run.py:3-10`, `backend/requirements.txt:1-4`, `launchd/templates/start-backend-prod.sh.tmpl:20-31`

### Frontend

Next.js App Router と React を使い、UI は MUI と Emotion で構成する。ブラウザ向け API は Next.js Route Handler が backend へ中継する。

なぜ: UI と backend token の cookie 管理を同じ frontend サービスに集約し、ブラウザから backend を隠すため。

根拠: `frontend/package.json:11-25`, `frontend/app/api/_shared.ts:3-20`, `frontend/app/api/auth/login/route.ts:43-55`

### Runtime

macOS launchd が backend、frontend、autossh tunnel を常駐化する。runtime ファイルは追跡対象の template からローカル生成し、生成物自体は Git 管理しない。

なぜ: リポジトリの配置パスを template に固定せず、各 checkout で正しい絶対パスを埋め込むため。

根拠: `launchd/render-prod-files.sh:4-24`, `.gitignore:45-56`, `launchd/templates/*.tmpl`

## セキュリティ方針

- Backend と frontend は loopback bind を維持する。根拠: `backend/run.py:10`, `launchd/templates/start-backend-prod.sh.tmpl:28`, `launchd/templates/start-frontend-prod.sh.tmpl:34`
- VPS Nginx は HTTPS、mTLS、CRL を設定し、client certificate を要求する。根拠: `server/nginx/tunnel.starton.jp.conf.example:31-68`
- アプリ認証は ID/password と有効期限付き署名 token を使う。根拠: `backend/tmux_dashboard/auth.py:12-38`, `backend/tmux_dashboard/routes.py:86-122`
- production では `DASHBOARD_AUTH_SECRET` を必須とする。根拠: `backend/tmux_dashboard/config.py:75-89`, `launchd/templates/start-backend-prod.sh.tmpl:14-18`
- ログイン失敗は client IP ごとに回数制限する。proxy header は接続元が loopback の場合だけ参照する。根拠: `backend/tmux_dashboard/routes.py:19-32`, `backend/tmux_dashboard/auth.py:40-55`
- pane/SSH の command 表示では password、token、secret、API key、Bearer token をマスクする。根拠: `backend/tmux_dashboard/collectors.py:8-24`
- action 失敗の HTTP response には stdout/stderr を含めず、詳細は server log に限定する。根拠: `backend/tmux_dashboard/routes.py:49-59`, `backend/tmux_dashboard/routes.py:168-178`
- 実行可能 action は `DASHBOARD_ALLOWED_ACTIONS` で制限する。根拠: `backend/tmux_dashboard/config.py:8-18`, `backend/tmux_dashboard/config.py:66-72`, `backend/tmux_dashboard/routes.py:163-164`

## パフォーマンス方針

- UI は snapshot と pane detail を 3 秒間隔で更新する。根拠: `frontend/app/page.tsx:35`, `frontend/app/page.tsx:77-86`, `frontend/app/pane/[paneId]/page.tsx`
- tmux、ps、lsof の subprocess は 5 秒で timeout する。根拠: `backend/tmux_dashboard/collectors.py:8`, `backend/tmux_dashboard/collectors.py:27-34`, `backend/tmux_dashboard/actions.py:6-24`
- collector は取得失敗時に空状態を返し、dashboard 全体の例外へ直結させない。根拠: `backend/tmux_dashboard/collectors.py:27-34`, `backend/tmux_dashboard/collectors.py:58-76`

## 禁止事項・変更時の制約

- backend や frontend を外部インターフェースへ直接 bind しない。
- 新しい action は handler だけでなく `DEFAULT_ACTIONS`、API 制御、テストを同時に更新する。根拠: `backend/tmux_dashboard/actions.py:146-163`, `backend/tmux_dashboard/config.py:8-18`
- response に tmux の stdout/stderr や未マスクの command を追加しない。
- 生成済み `launchd/start-*.sh` と `launchd/*.plist` を source of truth にしない。変更対象は `launchd/templates/` と `launchd/render-prod-files.sh` である。根拠: `.gitignore:45-56`, `launchd/render-prod-files.sh:15-24`
- DB 導入やコンテナ化は、現在の構成からの設計変更として L0 と運用文書を先に再評価する。

## 未確認事項

- rate limit を複数 gunicorn worker 間で共有する要件。理由: 現状は worker 内メモリであり、共有ストアはない。確認先: 運用要件と `backend/tmux_dashboard/auth.py`。
- action の監査ログ保持期間。理由: application log 出力はあるが rotation/retention 定義がない。確認先: launchd ログ運用または外部 logrotate 設定。
