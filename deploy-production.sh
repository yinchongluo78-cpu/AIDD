#!/bin/bash

# 生产环境部署脚本 - 包含所有修复
# 使用方法: ./deploy-production.sh

set -e  # 遇到错误立即退出

SERVER="120.24.22.244"
USER="root"
DEPLOY_PATH="/var/www/lyc-ai"

echo "🚀 开始部署修复版本到生产环境..."
echo "服务器: $SERVER"
echo "部署路径: $DEPLOY_PATH"
echo "================================"

# 1. 检查必要文件
echo ""
echo "📋 1. 检查必要文件..."
if [ ! -f "api/src/services/oss.ts" ]; then
    echo "❌ OSS服务文件不存在,请先运行修复"
    exit 1
fi

if [ ! -f "nginx-production.conf" ]; then
    echo "❌ Nginx配置文件不存在"
    exit 1
fi

echo "✅ 文件检查通过"

# 2. 安装依赖(如果需要)
echo ""
echo "📦 2. 检查并安装依赖..."
cd api
if [ ! -d "node_modules" ] || [ ! -d "node_modules/ali-oss" ]; then
    echo "安装后端依赖..."
    npm install
fi
cd ..

cd web
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi
cd ..

# 3. 构建前端
echo ""
echo "🔨 3. 构建前端..."
cd web
npm run build
cd ..

# 4. 编译后端
echo ""
echo "🔨 4. 编译后端..."
cd api
npm run build
cd ..

# 5. 创建部署包
echo ""
echo "📦 5. 创建部署包..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_FILE="deploy-fixed-${TIMESTAMP}.tar.gz"

tar -czf $DEPLOY_FILE \
  --exclude=node_modules \
  --exclude=.git \
  --exclude='*.log' \
  --exclude='deploy-*.tar.gz' \
  --exclude='api/uploads' \
  web/dist \
  api/dist \
  api/src \
  api/package*.json \
  api/prisma \
  api/.env.production \
  nginx-production.conf

echo "✅ 部署包创建成功: $DEPLOY_FILE"

# 6. 上传到服务器
echo ""
echo "📤 6. 上传到服务器..."
scp $DEPLOY_FILE ${USER}@${SERVER}:/tmp/

# 7. 在服务器上部署
echo ""
echo "🔧 7. 在服务器上执行部署..."
ssh ${USER}@${SERVER} << 'ENDSSH'

set -e
DEPLOY_PATH="/var/www/lyc-ai"
DEPLOY_FILE=$(ls -t /tmp/deploy-fixed-*.tar.gz | head -1)

echo "解压部署文件: $DEPLOY_FILE"
cd $DEPLOY_PATH
tar -xzf $DEPLOY_FILE

echo "安装后端生产依赖..."
cd api
npm install --production

echo "更新Nginx配置..."
sudo cp $DEPLOY_PATH/nginx-production.conf /etc/nginx/conf.d/lyc-ai.conf

echo "测试Nginx配置..."
sudo nginx -t

echo "重启Nginx..."
sudo systemctl reload nginx

echo "重启PM2服务..."
pm2 restart lyc-ai-api || pm2 start dist/index.js --name lyc-ai-api

echo "查看服务状态..."
pm2 list
pm2 logs lyc-ai-api --lines 10 --nostream

echo ""
echo "✅ 服务器部署完成!"

ENDSSH

# 8. 测试部署
echo ""
echo "🧪 8. 测试部署..."
echo "测试健康检查..."
sleep 3
curl -s http://$SERVER/api/health && echo "✅ API健康检查通过" || echo "❌ API健康检查失败"

# 9. 清理本地部署包
echo ""
echo "🧹 9. 清理本地部署包..."
# rm -f $DEPLOY_FILE  # 保留部署包以备回滚

echo ""
echo "================================"
echo "🎉 部署完成!"
echo ""
echo "访问地址: http://$SERVER"
echo "API地址: http://$SERVER/api/health"
echo ""
echo "📝 主要更新:"
echo "  ✅ 配置阿里云OSS上传"
echo "  ✅ 修复图片上传流程"
echo "  ✅ 添加知识库选择UI"
echo "  ✅ 更新Nginx配置(上传限制和超时)"
echo ""
echo "💡 提示:"
echo "  - 部署包已保存: $DEPLOY_FILE"
echo "  - 查看日志: ssh $USER@$SERVER 'pm2 logs lyc-ai-api'"
echo "  - 回滚: 使用之前的部署包重新部署"
echo ""