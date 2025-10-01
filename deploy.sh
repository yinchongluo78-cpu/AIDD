#!/bin/bash

# 阿里云ECS部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始部署到阿里云ECS..."

# 配置变量 - 替换为你的实际信息
ECS_HOST="your-ecs-ip"  # 替换为你的ECS公网IP
ECS_USER="root"          # ECS用户名
DEPLOY_PATH="/var/www/lyc-ai"  # 服务器部署路径

# 1. 构建前端
echo "📦 构建前端..."
cd web
npm run build

# 2. 构建后端
echo "📦 准备后端文件..."
cd ../api
npm run build

# 3. 创建部署包
echo "📦 创建部署包..."
cd ..
tar -czf deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=uploads \
  web/dist \
  api/dist \
  api/package*.json \
  api/prisma \
  api/.env.production

# 4. 上传到服务器
echo "📤 上传到服务器..."
scp deploy.tar.gz $ECS_USER@$ECS_HOST:/tmp/

# 5. 在服务器上执行部署
echo "🔧 在服务器上部署..."
ssh $ECS_USER@$ECS_HOST << 'EOF'
  # 创建部署目录
  mkdir -p /var/www/lyc-ai
  cd /var/www/lyc-ai

  # 解压文件
  tar -xzf /tmp/deploy.tar.gz

  # 安装后端依赖
  cd api
  npm install --production

  # 运行数据库迁移
  npx prisma migrate deploy

  # 使用PM2管理进程
  pm2 stop lyc-api || true
  pm2 start dist/index.js --name lyc-api
  pm2 save

  # 配置Nginx（如果未配置）
  if [ ! -f /etc/nginx/sites-available/lyc-ai ]; then
    echo "配置Nginx..."
    cat > /etc/nginx/sites-available/lyc-ai << NGINX
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    # 前端静态文件
    root /var/www/lyc-ai/web/dist;
    index index.html;

    # API转发
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # 前端路由
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

    ln -s /etc/nginx/sites-available/lyc-ai /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
  fi

  echo "✅ 部署完成！"
EOF

# 6. 清理
rm deploy.tar.gz

echo "🎉 部署成功！网站已上线。"
echo "访问: http://$ECS_HOST"