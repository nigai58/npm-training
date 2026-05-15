#!/bin/bash
set -e

# -----------------------------------------------
# 保育日誌AI生成サービス セットアップスクリプト
# 対象OS: Debian
# 使い方: sudo bash setup.sh
# -----------------------------------------------

# --- 設定入力 ---
read -p "ドメイン名を入力してください (例: hoiku.example.com): " DOMAIN
read -p "メールアドレスを入力してください (Let's Encrypt用): " EMAIL
read -p "ANTHROPIC_API_KEY を入力してください: " API_KEY
REPO_DIR="/var/www/hoiku-nippou"

echo ""
echo "=== セットアップ開始 ==="

# --- システム更新 ---
apt-get update -y

# --- Node.js 20 インストール ---
if ! command -v node &> /dev/null; then
  echo "[1/6] Node.js をインストール中..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/6] Node.js は導入済み ($(node -v))"
fi

# --- PM2 インストール ---
if ! command -v pm2 &> /dev/null; then
  echo "[2/6] PM2 をインストール中..."
  npm install -g pm2
else
  echo "[2/6] PM2 は導入済み"
fi

# --- nginx インストール ---
if ! command -v nginx &> /dev/null; then
  echo "[3/6] nginx をインストール中..."
  apt-get install -y nginx
else
  echo "[3/6] nginx は導入済み"
fi

# --- certbot インストール ---
if ! command -v certbot &> /dev/null; then
  echo "[4/6] certbot をインストール中..."
  apt-get install -y certbot python3-certbot-nginx
else
  echo "[4/6] certbot は導入済み"
fi

# --- アプリのデプロイ ---
echo "[5/6] アプリをデプロイ中..."
if [ -d "$REPO_DIR" ]; then
  git -C "$REPO_DIR" pull
else
  git clone https://github.com/nigai58/npm-training.git "$REPO_DIR"
  git -C "$REPO_DIR" checkout claude/brainstorm-web-service-ypncx
fi

cd "$REPO_DIR"
npm install --omit=dev

# 環境変数ファイルを作成
cat > /etc/environment.d/hoiku.conf << EOF
ANTHROPIC_API_KEY=$API_KEY
EOF

# PM2 起動
ANTHROPIC_API_KEY="$API_KEY" pm2 start ecosystem.config.js --update-env
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

# --- nginx 設定 ---
echo "[6/6] nginx と SSL を設定中..."
sed "s/YOUR_DOMAIN/$DOMAIN/g" "$REPO_DIR/nginx.conf.template" \
  > /etc/nginx/sites-available/hoiku-nippou

ln -sf /etc/nginx/sites-available/hoiku-nippou /etc/nginx/sites-enabled/hoiku-nippou
rm -f /etc/nginx/sites-enabled/default

# まず HTTP だけで nginx を起動してから certbot を実行
sed -i '/ssl_certificate/d;/ssl_dhparam/d;/options-ssl/d;/listen 443/d;/return 301/d' \
  /etc/nginx/sites-available/hoiku-nippou 2>/dev/null || true
nginx -t && systemctl reload nginx

# SSL 証明書取得
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"

systemctl enable nginx
systemctl restart nginx

echo ""
echo "=== 完了 ==="
echo "https://$DOMAIN でアクセスできます"
