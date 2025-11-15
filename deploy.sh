#!/bin/bash
set -e

SERVER_IP="120.24.22.244"
SERVER_PORT="2222"
SERVER_USER="root"
SERVER_PATH="/root/myproject/lyc2"

echo "🚀 开始部署到服务器 ${SERVER_IP}"
echo ""

# 部署 API（后端）
echo "📦 [1/4] 部署 API（后端）..."
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e
cd /root/myproject/lyc2
git fetch --all
git checkout main
git reset --hard origin/main

cd api
pnpm install --prefer-offline
pnpm build

if pm2 describe super-scholar-api >/dev/null 2>&1; then
  pm2 reload super-scholar-api
else
  pm2 start ecosystem.config.js
fi
pm2 save

echo "✅ API 部署完成"
ENDSSH

# 部署 Web（前端）
echo "📦 [2/4] 部署 Web（前端）..."
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e
cd /root/myproject/lyc2/web
pnpm install --prefer-offline
pnpm build

sudo rm -rf /var/www/lyc2/web/dist
sudo mkdir -p /var/www/lyc2/web
sudo cp -r dist /var/www/lyc2/web/

echo "✅ Web 构建完成"
ENDSSH

# 重载 Nginx
echo "🔄 [3/4] 重载 Nginx..."
ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "✅ 部署完成！"
echo "🌐 访问你的域名查看最新版本"
