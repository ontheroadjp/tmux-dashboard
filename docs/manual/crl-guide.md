# CRL Operation Guide

## 目的
- mTLS で使うクライアント証明書を「期限内でも」失効させる運用を確立する。

## 前提
- Nginx に以下が設定済み:

```nginx
ssl_client_certificate /etc/nginx/client-ca/ca.crt;
ssl_crl /etc/nginx/client-ca/ca.crl;
ssl_verify_client on;
```

- CA 管理ディレクトリ: `/etc/nginx/client-ca`

## 1. 初回セットアップ（CA DB 準備）

```bash
cd /etc/nginx/client-ca

sudo touch index.txt
sudo sh -c 'echo 1000 > serial'
sudo sh -c 'echo 1000 > crlnumber'
```

`openssl.cnf` が無い場合は最小構成を作成:

```bash
cat > /tmp/openssl-ca.cnf <<'EOF2'
[ ca ]
default_ca = CA_default

[ CA_default ]
dir               = /etc/nginx/client-ca
database          = $dir/index.txt
new_certs_dir     = $dir
certificate       = $dir/ca.crt
private_key       = $dir/ca.key
serial            = $dir/serial
crlnumber         = $dir/crlnumber
default_md        = sha256
default_days      = 825
default_crl_days  = 30
policy            = policy_any
x509_extensions   = usr_cert
copy_extensions   = copy

[ policy_any ]
commonName = supplied

[ usr_cert ]
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth
EOF2

sudo mv /tmp/openssl-ca.cnf /etc/nginx/client-ca/openssl.cnf
```

初回 CRL 生成:

```bash
cd /etc/nginx/client-ca
sudo openssl ca -config openssl.cnf -gencrl -out ca.crl
sudo chmod 644 ca.crl
sudo nginx -t && sudo systemctl reload nginx
```

## 2. 証明書を失効する

対象証明書を失効:

```bash
cd /etc/nginx/client-ca
sudo openssl ca -config openssl.cnf -revoke client-iphone.crt
```

CRL 再生成:

```bash
sudo openssl ca -config openssl.cnf -gencrl -out ca.crl
sudo chmod 644 ca.crl
```

Nginx 反映:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 3. 失効後の再発行
- 失効した端末を再利用する場合は、新しい鍵/証明書で `*.p12` を再発行して再インストールする。
- 失効済み証明書は再利用不可。

## 4. 確認コマンド

```bash
# CRL内容確認
openssl crl -in /etc/nginx/client-ca/ca.crl -text -noout

# Nginx設定内のCRL有効化確認
sudo nginx -T | rg -n "ssl_client_certificate|ssl_crl|ssl_verify_client"

# エラーログ確認
sudo tail -n 100 /var/log/nginx/error.log
```
