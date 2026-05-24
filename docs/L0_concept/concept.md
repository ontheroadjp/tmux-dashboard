# Concept

## プロダクトの目的

ローカル Mac 上の tmux セッション・ウインドウ・pane の状態をブラウザ（iPhone を含むスマホ）から確認・操作できる Web ダッシュボードを提供する。

根拠: `README.md:3`

## 解決する問題

- tmux の状態確認・操作がローカル端末でしかできない（外出先・スマホから参照できない）
- SSH 直接接続なしに tmux 操作コマンドを安全に発行できる仕組みがない

## 対象ユーザー

個人開発者（作者本人）。macOS 上で tmux を常用し、外部端末（主に iPhone）から tmux セッションを参照・操作したい。

## アーキテクチャ上の設計制約

```
[iPhone / Browser]
       ↓ HTTPS + mTLS（クライアント証明書）
[VPS: Nginx]
       ↓ SSH Reverse Tunnel（autossh）
[localhost: Next.js  :4000 (dev) / :10322 (prod)]
       ↓ HTTP（same host）
[localhost: Flask    :5001 (dev) / :10323 (prod)]
       ↓ CLI
[tmux]
```

根拠: `README.md:22`

### 制約の意味

- **バックエンドは外部公開しない**: Flask の listen は `127.0.0.1` 固定。外部から直接叩けない。
  - 根拠: `backend/run.py:8`
- **フロントエンドも直接公開しない**: SSH リバーストンネル（autossh）経由で VPS Nginx に中継させる。ローカル IP 以外からのアクセスは届かない構成。
  - 根拠: `launchd/start-tunnel-prod.sh`
- **mTLS で端末認証**: VPS の Nginx がクライアント証明書を要求し、証明書のない端末をブロックする。
  - 根拠: `server/tunnel.starton.jp.conf`（ssl_verify_client 設定）
- **macOS launchd で常駐化**: Docker/k8s は使用しない。macOS の標準プロセス管理（LaunchAgent）で backend / frontend / tunnel を常駐させる。
  - 根拠: `launchd/*.plist`

## 未確認事項

- なし（上記はすべてコード・設定ファイルから確認）
