# Concept

## プロダクトの目的

tmux-dashboard は、ローカル Mac 上の tmux セッション、window、pane をブラウザから確認し、許可された操作を実行するための Web ダッシュボードである。トップ画面は tmux とネットワークの状態を取得し、pane 詳細画面は出力表示とキー送信を提供する。

根拠: `README.md:1-30`, `frontend/app/page.tsx:35-170`, `frontend/app/pane/[paneId]/page.tsx`, `backend/tmux_dashboard/routes.py:128-182`

## 解決する問題

- tmux の状態確認をローカル端末に限定せず、スマートフォンを含むブラウザから行えるようにする。
- SSH シェルを直接操作せず、アプリケーションが許可した tmux action だけを HTTP API 経由で実行する。
- tmux と同じ Mac 上の listening server、SSH 接続、SSH tunnel 候補を同じ snapshot で確認する。

根拠: `backend/tmux_dashboard/collectors.py:58-207`, `backend/tmux_dashboard/actions.py:146-163`, `backend/tmux_dashboard/routes.py:128-178`

## 対象ユーザー

README と運用定義が示す対象環境は、tmux と launchd を利用する macOS ホスト、およびそのホストへ VPS 経由で接続するブラウザである。利用者の人数や組織形態はリポジトリから確定できない。

根拠: `README.md:1-40`, `launchd/templates/jp.ontheroad.tmux-dashboard.backend.prod.plist.tmpl:1-34`

## 設計上の制約

### ローカルサービスを直接公開しない

開発用 Flask は `127.0.0.1` に bind し、本番 backend と frontend も launchd の起動スクリプトで loopback に bind する。外部接続は autossh の reverse tunnel と VPS Nginx を経由する。

なぜ: tmux を操作できる API とローカルプロセス情報を、ホストの外部インターフェースへ直接露出しないため。

根拠: `backend/run.py:7-10`, `launchd/templates/start-backend-prod.sh.tmpl:25-31`, `launchd/templates/start-frontend-prod.sh.tmpl:28-34`, `launchd/templates/start-tunnel-prod.sh.tmpl:21-34`

### frontend を認証境界として使う

ブラウザは通常 same-origin の Next.js Route Handler を利用する。Route Handler は backend の Bearer token を HttpOnly cookie に保存し、backend リクエスト時に Authorization header へ変換する。

なぜ: token をクライアント JavaScript から直接参照させず、backend をブラウザへ直接公開しないため。

根拠: `frontend/app/api/auth/login/route.ts:43-55`, `frontend/app/api/_shared.ts:11-20`, `frontend/app/api/snapshot/route.ts:4-15`

### 永続データストアを持たない

認証 token は署名付きデータとして自己完結し、ログイン失敗回数は backend プロセスのメモリに保持する。DB、migration、ORM は存在しない。

なぜ: 現在の機能は tmux と OS の実行時状態を参照・操作するものであり、永続モデルを必要としていないため。

根拠: `backend/tmux_dashboard/auth.py:12-55`, `backend/requirements.txt:1-4`

## 未確認事項

- 想定利用者数と同時アクセス数。理由: 要件や負荷試験が存在しない。確認先: 新たなプロダクト要件文書または運用メトリクス。
- 対応ブラウザの明示的な範囲。理由: browserslist や E2E 対象定義が存在しない。確認先: `frontend/package.json` への設定追加またはブラウザ試験定義。
