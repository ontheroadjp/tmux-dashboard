# Specification Summary

## backend モジュール構成

### app.py
- `create_app()` が Flask インスタンスを生成し、`load_config()` / `AuthService` / `register_routes()` に依存注入する
  - 根拠: `backend/tmux_dashboard/app.py:12`

### routes.py
- `register_routes()` で全 HTTP ルートを定義（以前は app.py に直書きだったが分離済み）
  - 根拠: `backend/tmux_dashboard/routes.py:60`
- `_resolve_client_ip()`: remote_addr がループバックの場合 `X-Forwarded-For` → `X-Real-IP` の順で実 IP を解決
  - 根拠: `backend/tmux_dashboard/routes.py:19`
- action 失敗時レスポンスは `{ok, error, code}` のみ。`stderr`/`stdout` は漏洩しない（sanitized）
  - 根拠: `backend/tmux_dashboard/routes.py:47`

### auth.py
- `AuthService`: `itsdangerous.URLSafeTimedSerializer` で token 発行・検証
  - 根拠: `backend/tmux_dashboard/auth.py:15`
- `is_login_locked(ip, now_ts)` / `register_login_failure(ip, now_ts)` / `register_login_success(ip)` で IP ごとのレート制限
  - 根拠: `backend/tmux_dashboard/auth.py:40`

### config.py
- `AppConfig` dataclass に全設定を集約
  - 根拠: `backend/tmux_dashboard/config.py:23`
- prod 環境では `DASHBOARD_AUTH_SECRET` 必須（`auth_require_secret_in_prod=True` のとき ValueError）
  - 根拠: `backend/tmux_dashboard/config.py:89`

## API 仕様
- `GET /api/health`: `{ "ok": true }` （認証不要）
  - 根拠: `backend/tmux_dashboard/routes.py:80`
- `POST /api/auth/login`: user/password で認証し Bearer token を発行。ログイン失敗が上限を超えると 429。
  - 根拠: `backend/tmux_dashboard/routes.py:84`
- `GET /api/auth/session`: Bearer token を検証し認証済みユーザーを返す
  - 根拠: `backend/tmux_dashboard/routes.py:114`
- `POST /api/auth/logout`: `{"ok": true}` を返す（フロント側 cookie クリアが実体）
  - 根拠: `backend/tmux_dashboard/routes.py:122`
- `GET /api/snapshot`: 認証済みのみ。`{ tmux, network, allowed_actions }` を返す
  - 根拠: `backend/tmux_dashboard/routes.py:126`
- `GET /api/panes/<pane_id>`: 認証済みのみ。pane メタ情報 + pane 現在出力を返す
  - 根拠: `backend/tmux_dashboard/routes.py:140`
- `POST /api/actions/<action>`: 認証済みのみ action 実行。action が `allowed_actions` 外なら 403
  - 根拠: `backend/tmux_dashboard/routes.py:152`

## action 実装範囲
- `send_keys`, `select_pane`, `select_window`, `switch_client`
- `kill_pane`, `kill_window`, `kill_session`
- `new_window`, `split_window`

根拠:
- 実行分岐: `backend/tmux_dashboard/actions.py:146`
- デフォルト許可一覧: `backend/tmux_dashboard/config.py:9`

### send_keys の特殊挙動
- `keys=["-l", "<text>"]` 形式の場合 `tmux send-keys -l -t <pane> <text>` としてリテラル送信
  - 根拠: `backend/tmux_dashboard/actions.py:61`
- それ以外は `tmux send-keys -t <pane> <key_args...>` として送信
  - 根拠: `backend/tmux_dashboard/actions.py:65`

## UI 仕様（トップページ: frontend/app/page.tsx）
- 初回表示時に `/api/auth/session` でセッション確認。未認証の場合はログイン画面を表示
  - 根拠: `frontend/app/page.tsx:82`
- ログインは `/api/auth/login`、ログアウトは `/api/auth/logout` を使用
  - 根拠: `frontend/lib/api.ts:169`
- 3秒ポーリングで snapshot 更新（`POLL_MS = 3000`）
  - 根拠: `frontend/app/page.tsx:39`
- tmux / network / allowed_actions を1ページで表示
  - 根拠: `frontend/app/page.tsx:273`
- Material Design 3 ベースの UI（MUI theme + AppBar/Card/Chip/TextField/Button）で構成
  - 根拠: `frontend/lib/theme.ts:3`
- tmux セクションは「セッションカード一覧」をトップ表示とし、選択セッションのウインドウを Tabs で表示
  - 根拠: `frontend/app/page.tsx:344`
- セッションカードはモバイル表示で2列グリッド表示（`xs: "repeat(2, minmax(0, 1fr))"`）
  - 根拠: `frontend/app/page.tsx:304`
- 選択ウインドウ内で pane 情報を表示し、`pane No.{pane.index}` を表示
  - 根拠: `frontend/app/page.tsx:373`
- pane クリックで `/pane/[paneId]` に遷移する（トップページに Actions 入力欄なし）
  - 根拠: `frontend/app/page.tsx:370`
- 初期選択は「sessionOrder（数値昇順 → 名前昇順）で最初のセッション」「index が最小のウインドウ」
  - 根拠: `frontend/app/page.tsx:41`, `frontend/app/page.tsx:159`
- ヘッダー: 左端の TerminalIcon でトップ遷移、ユーザーアバター、LogoutIcon ボタン
  - 根拠: `frontend/app/page.tsx:253`
- API_LABEL (`API: ${API_LABEL}`) をトップページのコンテンツ部に Chip で表示
  - 根拠: `frontend/app/page.tsx:269`
- スマホ表示での横幅変動を抑えるため、主要コンテナに `minWidth: 0` とテキスト折り返し制御を適用
  - 根拠: `frontend/app/page.tsx:251`, `frontend/app/page.tsx:267`

## UI 仕様（pane 詳細ページ: frontend/app/pane/[paneId]/page.tsx）
- 「1ページ = 1ウインドウ」として表示。ウインドウ内ペインをタブで切り替える
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:396`
- タブ数はウインドウ内ペイン数に連動し、タブラベルは `pane.title || pane.id`
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:403`
- アクティブタブの pane 詳細のみ 3 秒ポーリングする（`isKeysFocused` 中は抑止）
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:151`
- サブヘッダー（タブ行）は `position: sticky; top: 0; zIndex: appBar` で上端固定
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:387`
- ヘッダーにウィンドウ名 + ▼ ドロップダウンメニューでウィンドウ切替が可能
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:339`
- Pane Info はアコーディオンで折りたたみ可能（初期展開）
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:421`
- Pane Info と Current Output は同一カード内で表示
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:419`
- pane title の文字列に応じてアイコン表示を切り替える（titleベース判定）
  - `codex` / `claude code` / `gemini` を含む: SmartToyIcon（緑）
  - `server` / `サーバー` を含む: DnsIcon（青）
  - `tunnel` / `ssh` を含む: VpnLockIcon
  - その他: TerminalIcon
  - 非アクティブタブはモノクロ表示（`active: false` → `color: "text.primary"`）
  - 根拠: `frontend/lib/titleIcon.tsx:7`
- API_LABEL はヘッダー内に表示
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:370`
- Actions の対象は選択中 pane 固定
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:246`
- Actions レイアウト:
  - 1段目: keys 入力欄（multiline 3行）
  - 2段目: 2:1 幅の `send key` / `clear`（clear は `color="error"` = 赤）
  - 3段目: 2:1 幅の `send enter` / `ESC`
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:502`
- `keys` 入力欄の初期値は空文字
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:67`
- `send key` は `keys` が空欄のとき `send_keys(keys=["C-u"])` を送ってプロンプト入力行をクリア
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:203`
- `send key` は `keys` 入力時に `send_keys(keys=["-l", <keys>])` を送ってリテラル送信
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:205`
- `clear` は tmux には送信せず、`keys` 入力欄を空にするだけ
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:228`
- `send enter` は `send_keys(keys=["Enter"])` を送信
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:210`
- `ESC` は `send_keys(keys=["Escape"])` を送信
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:219`
- keys 入力欄はフォーカス中はポーリング更新を抑止（`isKeysFocused`）
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:153`
- keys 入力欄に `autoCapitalize="none"` / `autoCorrect="off"` / `autoComplete="off"` / `spellCheck=false` を適用
  - 根拠: `frontend/app/pane/[paneId]/page.tsx:491`
- actions API エラー表示は backend の `stderr` を優先して表示する
  - 根拠: `frontend/lib/api.ts:163`

## Next.js route handler の認証中継仕様
- ログイン: backend の token を受け取り、HttpOnly cookie (`tmux_dashboard_token`) にセットして返す
  - 根拠: `frontend/app/api/auth/login/route.ts:49`
- session 確認: cookie から token を取り出し `Authorization: Bearer` として backend に転送
  - 根拠: `frontend/app/api/auth/session/route.ts:5`, `frontend/app/api/_shared.ts:11`
- ログアウト: cookie を maxAge=0 でクリア。backend へのリクエストは best-effort（失敗しても cookie はクリアされる）
  - 根拠: `frontend/app/api/auth/logout/route.ts:9`
- `BACKEND_API_BASE` 未設定時: `NODE_ENV=development` → `http://127.0.0.1:5001`、production → `http://127.0.0.1:10323`
  - 根拠: `frontend/app/api/_shared.ts:3`
- `X-Forwarded-For` / `X-Real-IP` はログインリクエスト時に backend に透過転送（rate limit の IP 解決に使われる）
  - 根拠: `frontend/app/api/auth/login/route.ts:6`

## テストで検証される仕様
- `send_keys` の `-l` リテラル送信分岐と `target_pane` 必須は単体テストで検証
  - 根拠: `backend/tests/test_actions.py:4`
- action 失敗時レスポンスに `stderr`/`stdout` が漏洩しないことをテストで確認
  - 根拠: `backend/tests/test_app.py:150`
- ログインレート制限（429 応答・loopback/non-loopback IP 解決）をテストで確認
  - 根拠: `backend/tests/test_app.py:35`

## 未確認事項
- action ごとの確認ダイアログ・監査ログ
  - 確定できない理由: 実装が未存在。
  - 次に確認するファイル: `frontend/app/pane/[paneId]/page.tsx`, `backend/tmux_dashboard/routes.py`
