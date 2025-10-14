#!/bin/bash

# 在服务器上执行此脚本来部署前端更新

cd /root/web

echo "📥 拉取最新代码..."
git pull origin main

echo "📦 安装依赖..."
npm install

echo "🔨 构建前端..."
npm run build

echo "🔄 重启 Nginx（如果需要）..."
nginx -s reload

echo "✅ 前端部署完成！"
echo "请在浏览器中测试新功能"
