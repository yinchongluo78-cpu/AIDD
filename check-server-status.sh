#!/bin/bash

# 服务器状态全面检查脚本
# 使用方法: ./check-server-status.sh

SERVER="120.24.22.244"
USER="root"

echo "🔍 开始检查服务器状态..."
echo "服务器: $SERVER"
echo "================================"

# 使用SSH执行远程命令
ssh ${USER}@${SERVER} << 'ENDSSH'

echo ""
echo "📁 1. 检查项目目录结构"
echo "================================"
ls -lah /var/www/lyc-ai/ 2>/dev/null || echo "❌ 项目目录不存在"

echo ""
echo "📂 2. 检查uploads目录"
echo "================================"
if [ -d "/var/www/lyc-ai/api/uploads" ]; then
    echo "✅ uploads目录存在"
    du -sh /var/www/lyc-ai/api/uploads
    ls -lh /var/www/lyc-ai/api/uploads | head -10
else
    echo "❌ uploads目录不存在"
fi

echo ""
echo "🔧 3. 检查PM2进程"
echo "================================"
pm2 list

echo ""
echo "📝 4. 查看API日志 (最近20行)"
echo "================================"
pm2 logs lyc-ai-api --lines 20 --nostream

echo ""
echo "🌐 5. 检查Nginx配置"
echo "================================"
echo "--- 主配置文件 ---"
ls -lh /etc/nginx/nginx.conf
echo ""
echo "--- conf.d目录 ---"
ls -lh /etc/nginx/conf.d/
echo ""
echo "--- 当前配置内容 ---"
cat /etc/nginx/conf.d/lyc-ai.conf 2>/dev/null || cat /etc/nginx/sites-enabled/default

echo ""
echo "🧪 6. 测试API健康状态"
echo "================================"
curl -s http://localhost:3001/api/health || echo "❌ API无法访问"

echo ""
echo "📊 7. 检查数据库连接"
echo "================================"
cd /var/www/lyc-ai/api
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => { console.log('✅ 数据库连接成功'); process.exit(0); })
  .catch((e) => { console.log('❌ 数据库连接失败:', e.message); process.exit(1); });
" 2>&1

echo ""
echo "🔐 8. 检查环境变量配置"
echo "================================"
if [ -f "/var/www/lyc-ai/api/.env.production" ]; then
    echo "✅ .env.production 存在"
    echo "配置内容(敏感信息已隐藏):"
    cat /var/www/lyc-ai/api/.env.production | sed 's/=.*/=****/g'
else
    echo "❌ .env.production 不存在"
fi

echo ""
echo "💾 9. 检查磁盘空间"
echo "================================"
df -h /var/www

echo ""
echo "🔍 10. 检查端口占用"
echo "================================"
netstat -tlnp | grep -E ':(80|443|3001|3000)' || ss -tlnp | grep -E ':(80|443|3001|3000)'

echo ""
echo "================================"
echo "✅ 检查完成!"

ENDSSH

echo ""
echo "💡 提示: 如果看到任何 ❌ 标记,说明有问题需要修复"
echo "💡 检查完成后,我们将根据结果制定修复方案"