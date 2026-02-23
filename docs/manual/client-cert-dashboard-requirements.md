# Client Certificate Dashboard 要件定義（AIエージェント実装指示書）

## 1. 目的
- mTLS 用クライアント証明書の発行・配布・失効・監査を一元管理する。
- 対象は VPS 上の Nginx で利用するクライアント証明書運用。
- tmux-dashboard とは分離し、汎用的な証明書管理サービスとして実装する。

## 2. 非目的
- tmux 操作や開発ダッシュボード機能の提供。
- CA 秘密鍵のオンライン常時配置（原則禁止）。
- 既存業務アプリの認可機能代替。

## 3. 前提
- Nginx は mTLS (`ssl_client_certificate`, `ssl_verify_client on`) で運用中。
- CRL (`ssl_crl`) 運用を行う。
- 対象ドメインは複数（例: prod/dev サブドメイン）だが、同一 CA で検証する。

## 4. 必須要件（MVP）
1. 端末台帳
- 一覧表示: 端末名、証明書 CN、シリアル、発行日、失効日、状態（active/revoked/expired）。
- 検索/フィルタ: 状態、端末名、CN。

2. 発行リクエスト管理
- 新規リクエスト登録。
- ステータス遷移: requested -> issued -> revoked。

3. 証明書発行
- 手動署名フロー（初期）と自動署名フロー（拡張）を分離。
- `PKCS#12 (.p12)` 生成とパスフレーズ設定。

4. 配布
- ワンタイムダウンロードリンク発行。
- 有効期限（秒/分）設定。
- 1回ダウンロードで無効化（必須）。

5. 失効
- 証明書単位で失効可能。
- CRL 再生成。
- Nginx reload 実行（手動実行 or ジョブ実行）までを管理画面から実施可能。

6. 監査ログ
- 誰が、いつ、何をしたか（発行、配布リンク発行、失効、CRL更新）。
- 改ざん検知可能な形で保存（少なくとも append-only 方針）。

## 5. セキュリティ要件（必須）
1. ダッシュボード保護
- mTLS + アプリ認証（ID/PW + 2FA 推奨）。
- セッションは短 TTL。

2. 鍵管理
- CA 秘密鍵はオフライン/HSM/分離ストレージ優先。
- Web アプリと秘密鍵の同居禁止（MVP では「署名ワーカー分離」を必須）。

3. 入力/出力
- 全入力をバリデーション。
- エラーに内部パス・秘密情報を出さない。

4. レート制限
- ログイン、配布リンク解決、管理APIに制限を設定。

5. 権限分離
- `viewer`, `operator`, `admin` などの RBAC。
- 失効/CRL更新は高権限のみ。

## 6. 推奨アーキテクチャ
- `web`: 管理UI + API（証明書管理ロジック）
- `signer-worker`: 署名専用プロセス（キュー経由）
- `storage`: 台帳DB + 監査ログ + 一時配布ストレージ
- `nginx-bridge`: CRL 配置と reload 実行の安全な橋渡し

補足:
- 署名処理は非同期ジョブ化し、UI からはジョブ状態を参照。

## 7. データモデル（最小）
- `devices`: id, name, platform, owner, status, created_at
- `certificates`: id, device_id, cn, serial, issued_at, expires_at, revoked_at, revoke_reason
- `requests`: id, device_name, requested_by, status, created_at, issued_cert_id
- `distribution_links`: id, cert_id, token, expires_at, one_time, used_at, status
- `audit_logs`: id, actor, action, target_type, target_id, detail_json, created_at

## 8. API（最小）
- `POST /api/requests`
- `GET /api/requests`
- `POST /api/requests/{id}/issue`
- `GET /api/certificates`
- `POST /api/certificates/{id}/revoke`
- `POST /api/links`
- `POST /api/links/{id}/invalidate`
- `GET /api/audit`
- `POST /api/crl/regenerate`
- `POST /api/nginx/reload`

## 9. UI 要件（最小）
- ダッシュボードトップ: Active/Revoked/Expiring Soon のサマリ。
- タブ: Requests / Certificates / Distribution Links / Audit。
- すべてのフォームに必須項目を `*` で明示。
- 危険操作（revoke / reload）は確認ダイアログ必須。

## 10. 運用要件
- バックアップ: DB と CRL を定期バックアップ。
- 期限通知: 7日前・1日前通知。
- 障害時: CRL再生成と Nginx 設定再適用の Runbook を同梱。

## 11. 受け入れ基準（Acceptance Criteria）
- 証明書発行から iPhone インストールまでの手順が 10 分以内で完了可能。
- 失効操作後、CRL反映により対象端末が即時アクセス不可になる。
- 監査ログから「誰が失効したか」を追跡できる。
- 主要APIに対して認証・認可・入力検証テストが通る。

## 12. 実装フェーズ
Phase 1:
- 台帳、リクエスト、手動発行記録、監査ログ。

Phase 2:
- ワンタイム配布リンク、失効、CRL再生成。

Phase 3:
- 署名ワーカー分離、自動通知、Nginx reload 自動化。

## 13. AIエージェントへの実装指示
- 破壊的変更禁止、最小差分で段階実装。
- 各フェーズでテストを追加し、回帰確認を必須化。
- 本番秘密情報（鍵、パスフレーズ、実ドメイン）はリポジトリに含めない。
- `.env.example` のみ追跡し、実 `.env` は `.gitignore` 対象にする。
- 最終的に `README` と運用 Runbook を同期する。
