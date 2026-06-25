#!/usr/bin/env bash
# VPS 上で実行する更新デプロイスクリプト。
# 初回セットアップ後は、コード更新のたびにこれを叩くだけで反映される。
#
#   sudo -u fumen APP_DIR=/opt/fumen BRANCH=master bash deploy/deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fumen}"
BRANCH="${BRANCH:-master}"
SERVICE="${SERVICE:-orchestra-fumen}"

cd "$APP_DIR"

echo "==> git fetch & reset to origin/$BRANCH"
git fetch --prune origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> install dependencies (production only)"
npm ci --omit=dev

echo "==> ensure data/storage dirs exist"
mkdir -p "$APP_DIR/data" "$APP_DIR/storage/scores"

echo "==> restart service: $SERVICE"
sudo systemctl restart "$SERVICE"
sleep 1
sudo systemctl --no-pager --lines=5 status "$SERVICE" || true

echo "==> done. health check:"
curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" && echo
