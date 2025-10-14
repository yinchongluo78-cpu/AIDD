#!/bin/bash

echo "=== 部署自定义指令功能 ==="

# 1. 压缩必要文件
echo "1. 打包文件..."
tar -czf custom-instructions-update.tar.gz \
  api/prisma/schema.prisma \
  api/src/routes/conversations.ts \
  api/dist/ \
  web/dist/

# 2. 上传到服务器
echo "2. 上传到服务器..."
scp custom-instructions-update.tar.gz root@120.24.22.244:/tmp/

# 3. 在服务器上执行部署
echo "3. 执行服务器端部署..."
ssh root@120.24.22.244 << 'ENDSSH'
cd /var/www/lyc-ai

# 解压文件
echo "解压更新文件..."
tar -xzf /tmp/custom-instructions-update.tar.gz

# 数据库迁移
echo "执行数据库迁移..."
cd api
npx prisma db push --skip-generate

# 重启服务
echo "重启服务..."
pm2 restart lyc-ai-api
pm2 restart lyc-ai-web

echo "部署完成！"
ENDSSH

# 清理本地临时文件
rm custom-instructions-update.tar.gz

echo "=== 部署成功 ==="
