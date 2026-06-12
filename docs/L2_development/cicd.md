# CI/CD

## CI

`.github/workflows/ci.yml` は `main` への push と pull request で起動する。

根拠: `.github/workflows/ci.yml:1-7`

### Backend Tests

Ubuntu 上で Python 3.12 の venv を作成し、requirements を install して pytest を実行する。

```text
python -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/pytest -q
```

なぜ: backend の依存解決と test を clean runner で再現するため。

根拠: `.github/workflows/ci.yml:9-25`

### Frontend Checks

Ubuntu 上で Node.js 20 と npm cache を使い、`npm ci`、typecheck、build を実行する。

```text
npm ci
npm run typecheck
npm run build
```

なぜ: lock file に従う再現可能な install と、TypeScript/Next.js の production build 成立を保証するため。

根拠: `.github/workflows/ci.yml:27-44`

## Server Config Deploy

`.github/workflows/deploy-server-config.yml` は `main` への push で `server/**` が変更された場合、または手動 dispatch で起動する。

根拠: `.github/workflows/deploy-server-config.yml:1-8`

処理:

1. VPS secret の存在を検証する。
2. SSH key と known_hosts を設定する。
3. `server/tunnel.starton.jp.conf` を VPS の `/tmp` へ upload する。
4. `/etc/nginx/sites-available/tunnel.starton.jp.conf` へ install する。
5. `nginx -t` 成功時だけ reload し、失敗時は backup を復元する。

なぜ: syntax error のある Nginx config を active state に残さないため。

根拠: `.github/workflows/deploy-server-config.yml:25-75`

## 重要な整合性条件

deploy workflow は `server/tunnel.starton.jp.conf` を参照するが、このファイルは `.gitignore` 対象であり、現在の tracked tree には存在しない。tracked example は `server/nginx/tunnel.starton.jp.conf.example` と `server/tunnel.example.conf` である。

根拠: `.github/workflows/deploy-server-config.yml:43-47`, `.gitignore:67-73`, tracked file list

このため server deploy は現状の tracked repository だけでは成功を保証できない。deploy を利用する前に、workflow の source path と追跡対象 config の方針を確定する必要がある。

## 未確認事項

- deploy 対象 `server/tunnel.starton.jp.conf` を Git 追跡する意図があるか。理由: workflow は要求するが `.gitignore` が除外している。確認先: `.github/workflows/deploy-server-config.yml`, `.gitignore`, repository policy。
- GitHub Secrets の実設定値と VPS 権限。理由: repository から参照できない。確認先: GitHub repository settings と VPS sudo policy。
