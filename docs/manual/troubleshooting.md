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

`ExitOnForwardFailure=yes` により、SSH はポートバインド失敗時に数秒以内に終了する。しかし autossh のデフォルト `AUTOSSH_GATETIME=30` によって「SSH が 30 秒以内に終了した = 接続失敗」と判定され、`AUTOSSH_POLL`（デフォルト 600 秒 = 10 分）の待機が発生する。

```
[Mac] autossh ─SSH─▶ [VPS] sshd (Session A: port 10322 保持)
      Session A 切断
      autossh が Session B を起動 ─▶ port 10322 使用中 → 失敗 → 数秒で exit
      autossh: "速すぎる終了 = 失敗" → AUTOSSH_POLL (600秒) 待機
      10分後 Session C 起動 ─▶ VPS がポートを解放済み → 成功
```

VPS 側の `ClientAliveInterval 15 / ClientAliveCountMax 3`（= 45 秒でポート解放）は設定済みだが、autossh の 10 分待機がボトルネックとなる。

### 対処

`AUTOSSH_GATETIME=0` を設定し、速すぎる終了によるポーリング待機を無効化する。これにより VPS がポートを解放した時点（45 秒以内）で即再接続できる。

`launchd/start-tunnel-prod.sh`（および dev 版）に以下が設定済みであることを確認する:

```bash
export AUTOSSH_GATETIME=0
```

設定後、tunnel を再起動する:

```bash
./launchd/restart-prod.sh tunnel
```

### 前提: VPS 側の設定

VPS の `/etc/ssh/sshd_config` に以下が設定されていること:

```
ClientAliveInterval 15
ClientAliveCountMax 3
```

未設定の場合は追加して `sudo systemctl restart sshd` を実行する。

### 参考: 各設定値の意味

| 設定 | 場所 | 値 | 意味 |
|---|---|---|---|
| `AUTOSSH_GATETIME` | Mac スクリプト | 0 | 速すぎる終了によるポーリング待機を無効化 |
| `AUTOSSH_SERVER_ALIVE_INTERVAL` | Mac スクリプト | 30 | SSH keepalive 送信間隔（秒） |
| `AUTOSSH_SERVER_ALIVE_COUNT_MAX` | Mac スクリプト | 3 | 無応答でのリトライ上限 |
| `ClientAliveInterval` | VPS sshd | 15 | VPS がクライアント死活確認する間隔（秒） |
| `ClientAliveCountMax` | VPS sshd | 3 | 無応答でセッション切断 → ポート解放（45 秒以内） |
