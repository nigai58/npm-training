# さくらのVPS デプロイ手順（サブドメイン: fumen）

`fumen.あなたのドメイン` でこのアプリを公開するための手順です。
構成は **Node プロセス（systemd 常駐） + nginx リバースプロキシ + Let's Encrypt(HTTPS)**。

前提: さくらVPSに Linux（Ubuntu / AlmaLinux など）が入っていて、`sudo` が使えること。
以下の `fumen.example.com` は自分のドメインに読み替えてください。

---

## 0. DNS を設定（さくらの「ドメイン/DNS」管理画面）

`fumen` の **A レコード**を、VPS のグローバル IP に向ける。

```
fumen   A   <VPSのIPアドレス>
```

反映確認:
```bash
dig +short fumen.example.com   # VPSのIPが返ればOK
```

## 1. 必要パッケージ

Ubuntu の場合:
```bash
sudo apt update
sudo apt install -y nginx git curl
# Node.js 20+（NodeSource）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
AlmaLinux/Rocky の場合は `apt` を `dnf` に、NodeSource は `setup_20.x | sudo bash -` 後 `sudo dnf install -y nodejs nginx git`。

## 1.5 Deploy key を GitHub に登録（このリポジトリは private のため必須）

VPS 上で生成した SSH 鍵の**公開鍵**を、GitHub の **Deploy key** として登録すると、
VPS から private リポジトリを SSH で clone/pull できるようになります。

1. （VPSで鍵が無ければ生成）`ssh-keygen -t ed25519 -C "reordo-deploy" -f ~/.ssh/id_ed25519`
2. 公開鍵 `~/.ssh/id_ed25519.pub` の内容をコピー
3. GitHub → リポジトリ `nigai58/npm-training` → **Settings → Deploy keys → Add deploy key**
   - Title: `reordo-deploy`
   - Key: 公開鍵を貼り付け（今回いただいた `deploy/reordo-deploy.pub` がそれ）
   - **Allow write access: チェックしない**（pull だけなので read-only で十分）
4. 接続確認: `ssh -T git@github.com` → "successfully authenticated" が出ればOK

> ⚠️ 秘密鍵 `~/.ssh/id_ed25519` は VPS の中だけに置き、誰にも渡さないでください。

## 2. 専用ユーザーとコード配置

```bash
sudo useradd --system --create-home --home-dir /opt/fumen --shell /usr/sbin/nologin fumen
# private リポジトリのため SSH(deploy key) で clone する
sudo -u fumen git clone git@github.com:nigai58/npm-training.git /opt/fumen
cd /opt/fumen
sudo -u fumen git checkout master   # 公開したいブランチ
sudo -u fumen npm ci --omit=dev
sudo -u fumen mkdir -p /opt/fumen/data /opt/fumen/storage/scores
```

> 補足: deploy key の秘密鍵を `fumen` ユーザーが使えるよう `~fumen/.ssh/id_ed25519` に配置するか、
> 鍵を持つ別ユーザーで clone してから所有者を `fumen` に変更してください。

## 3. 初期データ投入（任意）

```bash
# バンドル済みパブリックドメイン作品（ネット不要）
sudo -u fumen DB_PATH=/opt/fumen/data/app.db node /opt/fumen/scripts/import.js seed
# Mutopia の実データ（CC・再配布可）
sudo -u fumen DB_PATH=/opt/fumen/data/app.db node /opt/fumen/scripts/import.js mutopia --limit 30
```

## 4. systemd で常駐起動

```bash
sudo cp /opt/fumen/deploy/orchestra-fumen.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now orchestra-fumen
sudo systemctl status orchestra-fumen          # active (running) を確認
curl -fsS http://127.0.0.1:3000/api/health     # {"ok":true}
```

## 5. nginx リバースプロキシ

```bash
sudo cp /opt/fumen/deploy/nginx-fumen.conf /etc/nginx/conf.d/fumen.conf
sudo sed -i 's/fumen.example.com/fumen.あなたのドメイン/' /etc/nginx/conf.d/fumen.conf
sudo nginx -t && sudo systemctl reload nginx
```
この時点で `http://fumen.あなたのドメイン/` が見えるはず。

## 6. HTTPS（Let's Encrypt）

```bash
sudo apt install -y certbot python3-certbot-nginx      # dnf の場合は certbot python3-certbot-nginx
sudo certbot --nginx -d fumen.あなたのドメイン
```
certbot が 443 設定と自動更新を構成します。`SECURE_COOKIES=1`（systemd 既定）で
Cookie に `Secure` が付くため、HTTPS 化後にログインが安全になります。

## 7. ファイアウォール

さくらVPSのパケットフィルタ / OS の firewall で **80, 443** を開放（22 は自分のIPのみ推奨）。

---

## 以後の更新

GitHub に push した変更を反映するには、VPS で:
```bash
sudo -u fumen APP_DIR=/opt/fumen BRANCH=master bash /opt/fumen/deploy/deploy.sh
```
（`deploy.sh` 内の `systemctl restart` のため、fumen ユーザーに当該操作の sudo 許可が必要。
個人運用なら自分のユーザーで `sudo bash deploy/deploy.sh` でも可。）

## トラブルシュート

| 症状 | 確認 |
| --- | --- |
| 502 Bad Gateway | `systemctl status orchestra-fumen` / `journalctl -u orchestra-fumen -e` |
| ログインできない | HTTPS になっているか（Secure Cookie は HTTP では送られない）|
| 譜面が空 | 手順3の import を実行したか、`DB_PATH` が systemd と一致しているか |
| Mutopia 収集が失敗 | サーバが外部へ出られるか。プロキシ経由なら `NODE_USE_ENV_PROXY=1` |
