# Tunnel And Nginx Manual

## 目的
- VPS Nginx (`https://tmux.example.com`) から SSH reverse tunnel 経由でローカルホスト上の本番フロント (`127.0.0.1:10322`) を公開する。

## 前提
- VPS の Nginx は `https://tmux.example.com` を受ける。
- VPS から `127.0.0.1:<forward_port>` へプロキシする。
- ローカルホスト側 frontend は `127.0.0.1:10322` で待受する。

## 1. ローカルホスト側で reverse tunnel を起動

例: `forward_port=110322`

```bash
ssh -NT -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -R 127.0.0.1:110322:127.0.0.1:10322 <vps_user>@<vps_host>
```

## 2. VPS Nginx 設定例

```nginx
server {
  listen 443 ssl http2;
  server_name tmux.example.com;

  ssl_certificate /etc/letsencrypt/live/tmux.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/tmux.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:110322;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

## 3. 運用メモ
- トンネル断を避けるには `autossh` で常駐化する。
- backend ポート `10323` は外部公開せず、frontend 経由のみを推奨。
