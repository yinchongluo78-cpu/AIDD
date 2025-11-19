#!/bin/bash

# API自动部署脚本
# 确保部署到正确的PM2运行目录: /root/myproject/lyc2/api/

set -e  # 遇到错误立即退出

echo "🚀 开始部署 API..."

# 1. 编译TypeScript
echo "📦 编译 TypeScript..."
npm run build

# 2. 上传到服务器（正确的PM2目录）
echo "📤 上传编译文件到服务器..."
sshpass -p "Lyc001286" scp -P 2222 -o StrictHostKeyChecking=no -r dist/* root@120.24.22.244:/root/myproject/lyc2/api/dist/

# 3. 重启PM2
echo "🔄 重启 PM2 服务..."
sshpass -p "Lyc001286" ssh -p 2222 -o StrictHostKeyChecking=no root@120.24.22.244 "pm2 reload super-scholar-api"

# 4. 验证部署
echo "✅ 验证部署..."
sshpass -p "Lyc001286" ssh -p 2222 -o StrictHostKeyChecking=no root@120.24.22.244 "pm2 status super-scholar-api"

echo ""
echo "✅ API 部署成功！"
echo "📊 查看日志: ssh root@120.24.22.244 -p 2222"
echo "    然后运行: pm2 logs super-scholar-api"
