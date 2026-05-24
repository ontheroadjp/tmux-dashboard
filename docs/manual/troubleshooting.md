# Troubleshooting

## iPhone Safari: 初回接続時に証明書エラーが出て数分後に繋がる

### 症状

- iPhone Safari から初回アクセス時に「証明書が無効」「接続できません」のようなエラーが表示される
- 約 5 分待ってから再アクセスすると正常に表示される
- 一度繋がると、リロードや新規タブでのアクセスはすぐに成功する

### 調査手順

#### 1. OCSP Stapling の確認

```bash
openssl s_client -connect YOUR_DOMAIN:443 -status 2>/dev/null | grep "OCSP"
```

`OCSP responses: no responses sent` が返る場合、OCSP Stapling は無効。  
ただし Let's Encrypt は 2025 年以降 OCSP を廃止しており、証明書に OCSP レスポンダー URL が含まれないため Nginx で `ssl_stapling on` を設定しても効果がない（`[warn] ssl_stapling ignored` が出る）。**OCSP は原因ではない。**

#### 2. autossh トンネルのログ確認

```bash
tail -50 launchd/logs/tunnel.prod.err.log
```

以下のようなエラーが繰り返し出ていれば、トンネルの切断・再接続失敗が原因。

```
Error: remote port forwarding failed for listen port XXXX
client_loop: send disconnect: Broken pipe
```

### 原因

autossh トンネルが切断（Broken pipe）した後、VPS 側の sshd がクライアントの死活を検知するのが遅く、転送ポートを長時間保持し続ける。autossh はすぐに再接続するが、ポートがまだ使用中のため `remote port forwarding failed` となり、VPS がポートを解放するまで（数分）繋がらない。

```
[Mac] autossh ──SSH──▶ [VPS] sshd
                              └─ port 10322 を保持したまま
                                 (クライアント死活未検知)
      autossh が再接続 ──▶ port 10322 は使用中 → 失敗
      数分後にポート解放 ──▶ 再接続成功
```

### 対処

VPS の `/etc/ssh/sshd_config` に以下を追加し、sshd を再起動する。

```
ClientAliveInterval 15
ClientAliveCountMax 3
```

- `ClientAliveInterval 15`: 15 秒ごとにクライアントの死活確認
- `ClientAliveCountMax 3`: 3 回無応答で切断 → 45 秒以内にポートを解放

```bash
sudo systemctl restart sshd
```

再起動後、`tunnel.prod.err.log` に `remote port forwarding failed` が出なくなることを確認する。

### 参考: クライアント側の keepalive 設定

`launchd/start-tunnel-prod.sh`（または `tunnel/.env.prod`）で以下の変数を調整できる。

| 変数 | デフォルト | 意味 |
|---|---|---|
| `AUTOSSH_SERVER_ALIVE_INTERVAL` | 30 | SSH keepalive 送信間隔（秒） |
| `AUTOSSH_SERVER_ALIVE_COUNT_MAX` | 3 | 無応答でのリトライ上限 |

VPS 側の `ClientAliveInterval` より短く設定しておくと、クライアント側が先に切断を検知して再接続できる。
