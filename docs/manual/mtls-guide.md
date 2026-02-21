# mTLS Manual (Beginner Friendly)

## 目的
- mTLS (Mutual TLS) の仕組みを初学者向けに理解する。
- このプロジェクト構成で mTLS を設定し、運用できるようにする。
- コマンドの意味と、ハマりやすいエラーの対処を理解する。

## 想定構成
- クライアント: iPhone (Safari 推奨)
- 公開サーバー: VPS + Nginx (HTTPS終端)
- アプリ実体: 自宅Mac上の tmux-dashboard
- 接続経路: Nginx -> SSH reverse tunnel -> Mac frontend (`127.0.0.1:10322`)

## 1. mTLS とは

### 1-1. 通常のTLS
- サーバーだけが証明書を持つ。
- クライアントは「そのサーバーが本物か」を検証する。
- 例: 普通の HTTPS サイト。

### 1-2. mTLS (Mutual TLS)
- サーバー証明書に加えて、クライアント証明書も使う。
- サーバーは「アクセスしてきた端末が許可端末か」を検証できる。
- つまり「URLを知っているだけ」では入れない。

### 1-3. このプロジェクトでの意味
- `<HOST_A>` へのアクセス時に、iPhone証明書が必須。
- 証明書がない端末は Nginx で拒否される (`400` / `403`)。

## 2. 証明書の関係 (最重要)

- `CA証明書 (ca.crt)`: 証明書を発行する親。
- `CA秘密鍵 (ca.key)`: CA署名に使う最重要秘密。外部共有禁止。
- `クライアント証明書 (client-iphone.crt)`: iPhone用。
- `クライアント秘密鍵 (client-iphone.key)`: iPhone証明書の秘密鍵。
- `PKCS#12 (client-iphone.p12)`: iPhoneへ配布するための束 (証明書+秘密鍵)。

要点:
- Nginx に置くのは `ca.crt` (クライアント証明書の検証用)。
- iPhone に入れるのは `client-iphone.p12`。

## 3. Nginx 設定の考え方

`server` ブロックで以下を有効化すると mTLS 必須になる。

```nginx
ssl_client_certificate /etc/nginx/client-ca/ca.crt;
ssl_verify_client on;
ssl_verify_depth 2;
```

意味:
- `ssl_client_certificate`: 検証に使うCA証明書。
- `ssl_verify_client on`: クライアント証明書を必須化。
- `ssl_verify_depth`: 証明書チェーンの検証深度。

## 4. 設定手順 (VPS)

### 4-1. CA 作成

```bash
sudo mkdir -p /etc/nginx/client-ca
cd /etc/nginx/client-ca

sudo openssl genrsa -out ca.key 4096
sudo openssl req -x509 -new -nodes \
  -key ca.key \
  -sha256 \
  -days 3650 \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Example/CN=example-client-ca" \
  -out ca.crt

sudo chown root:root ca.key ca.crt
sudo chmod 600 ca.key
sudo chmod 644 ca.crt
```

コマンド意味:
- `genrsa`: RSA秘密鍵作成。
- `req -x509`: 自己署名CA証明書作成。
- `-days 3650`: 10年有効。
- `-subj`: 対話なしで証明書属性を指定。

### 4-2. iPhone用クライアント証明書作成

```bash
cd /etc/nginx/client-ca

cat > client-ext.cnf <<'EOF'
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth
subjectKeyIdentifier=hash
authorityKeyIdentifier=keyid,issuer
EOF

sudo openssl genrsa -out client-iphone.key 2048
sudo openssl req -new \
  -key client-iphone.key \
  -subj "/C=JP/ST=Tokyo/L=Tokyo/O=Example/CN=iphone-client-01" \
  -out client-iphone.csr

sudo openssl x509 -req \
  -in client-iphone.csr \
  -CA ca.crt \
  -CAkey ca.key \
  -CAcreateserial \
  -out client-iphone.crt \
  -days 825 \
  -sha256 \
  -extfile client-ext.cnf

sudo openssl pkcs12 -export \
  -inkey client-iphone.key \
  -in client-iphone.crt \
  -certfile ca.crt \
  -name "tmux-iphone-client-01" \
  -out client-iphone.p12
```

コマンド意味:
- `client-ext.cnf`: クライアント認証用途 (`extendedKeyUsage=clientAuth`) を明示。
- `req -new`: CSR (署名依頼) 作成。
- `x509 -req`: CAでCSRを署名してクライアント証明書を発行。
- `pkcs12 -export`: iPhone導入用 `.p12` を生成。

### 4-3. Nginx に mTLS 設定を反映

`server/tunnel.example.conf` の `server { ... listen 443 ssl ... }` に以下があることを確認:

```nginx
ssl_client_certificate /etc/nginx/client-ca/ca.crt;
ssl_verify_client on;
ssl_verify_depth 2;
```

反映:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 5. iPhone への導入

### 5-1. `.p12` を Mac に取得

Mac で実行:

```bash
scp <vps_user>@<vps_host>:/tmp/client-iphone.p12 ~/Downloads/
```

補足:
- `Permission denied` の場合、VPS側で `/tmp` にコピーして権限緩和してから取得する。

```bash
sudo cp /etc/nginx/client-ca/client-iphone.p12 /tmp/client-iphone.p12
sudo chmod 644 /tmp/client-iphone.p12
```

### 5-2. Mac -> iPhone
- AirDrop で `client-iphone.p12` を転送。

### 5-3. iPhone でインストール
- `client-iphone.p12` を開く。
- `設定 > 一般 > VPNとデバイス管理` からインストール。
- `.p12` 作成時のパスワードを入力。

推奨:
- iPhoneは Safari を使用（Chrome は mTLS 挙動が不安定なケースあり）。

## 6. よくあるエラーと対処

### 6-1. `SSL_CTX_load_verify_locations ... No such file or directory`
- 原因: `ssl_client_certificate` の `ca.crt` が存在しない。
- 対処: `/etc/nginx/client-ca/ca.crt` を作成/配置して再テスト。

### 6-2. `no required SSL certificate was sent`
- 原因: クライアント証明書が未提示。
- 対処:
  - iPhoneに `.p12` を再インストール
  - Safariでアクセス
  - 必要なら証明書を `clientAuth` 拡張付きで再発行

### 6-3. iPhone Safari は通るが Chrome は 400
- 原因: iOS Chrome 側のクライアント証明書取り扱い差異。
- 対処: iPhoneでは Safari を正式クライアントにする。

### 6-4. `scp permission denied`
- 原因: VPS側ファイル権限が厳しい。
- 対処: 一時的に `/tmp` にコピーして取得し、取得後削除。

## 7. 運用ベストプラクティス

- 端末ごとに別証明書を発行する。
- 紛失時は該当証明書を失効/再発行する。
- `ca.key` は厳重保管し、サーバー外バックアップを暗号化する。
- `.p12` 配布後はサーバー上の配布用ファイルを削除する。
- mTLS だけに頼らず、アプリ側認証 (ID/PW + token) も併用する。

## 8. チェックコマンド集

```bash
# Nginx設定確認
sudo nginx -t

# 再読み込み
sudo systemctl reload nginx

# エラーログ確認
sudo tail -n 100 /var/log/nginx/error.log

# mTLS関連設定が有効か確認
sudo nginx -T | rg -n "ssl_client_certificate|ssl_verify_client|server_name"
```
