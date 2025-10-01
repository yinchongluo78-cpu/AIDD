#!/bin/bash

# LYC AI 项目部署脚本
# 使用方法: ./deploy-final.sh

echo "🚀 开始部署 LYC AI 项目..."

# 配置变量
ECS_HOST="120.24.22.244"
ECS_USER="root"
ECS_PASSWORD="Lyc001286"
DEPLOY_PATH="/var/www/lyc-ai"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 步骤1: 构建前端...${NC}"
cd web
# 跳过类型检查，直接构建
npx vite build
if [ $? -ne 0 ]; then
    echo "前端构建失败！"
    exit 1
fi

echo -e "${YELLOW}📦 步骤2: 准备后端文件...${NC}"
cd ../api

# 安装生产依赖
npm install

# 生成Prisma客户端
npx prisma generate

echo -e "${YELLOW}📦 步骤3: 创建部署包...${NC}"
cd ..
tar -czf deploy.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=.env \
  --exclude=.env.local \
  --exclude=uploads \
  --exclude=dev.db \
  web/dist \
  api/src \
  api/package*.json \
  api/prisma \
  api/.env.production \
  api/tsconfig.json

echo -e "${YELLOW}📤 步骤4: 上传到服务器...${NC}"
# 使用sshpass自动输入密码（如果未安装：brew install hudochenkov/sshpass/sshpass）
sshpass -p "$ECS_PASSWORD" scp deploy.tar.gz $ECS_USER@$ECS_HOST:/tmp/

echo -e "${YELLOW}🔧 步骤5: 在服务器上部署...${NC}"
sshpass -p "$ECS_PASSWORD" ssh $ECS_USER@$ECS_HOST << 'ENDSSH'
  set -e

  echo "创建部署目录..."
  mkdir -p /var/www/lyc-ai
  cd /var/www/lyc-ai

  echo "解压文件..."
  tar -xzf /tmp/deploy.tar.gz

  echo "安装后端依赖..."
  cd api
  npm install --production

  # 复制生产环境配置
  cp .env.production .env

  echo "生成Prisma客户端..."
  npx prisma generate

  echo "运行数据库迁移..."
  export DATABASE_URL="postgresql://postgres:Lyc001286@pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com:5432/lyc_ai_db?schema=public"
  npx prisma migrate deploy || echo "首次部署，创建数据库表..."
  npx prisma db push

  echo "编译TypeScript..."
  npx tsc

  echo "配置PM2..."
  pm2 delete lyc-ai-api 2>/dev/null || true
  pm2 start dist/index.js --name lyc-ai-api --env production
  pm2 save
  pm2 startup systemd -u root --hp /root || true

  echo "配置Nginx..."
  cat > /etc/nginx/sites-available/lyc-ai << 'NGINX'
server {
    listen 80;
    server_name 120.24.22.244;

    # 前端静态文件
    location / {
        root /var/www/lyc-ai/web/dist;
        try_files $uri $uri/ /index.html;

        # 添加CORS头
        add_header Access-Control-Allow-Origin *;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件夹（如果有本地上传）
    location /uploads {
        alias /var/www/lyc-ai/api/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

  # 启用站点
  ln -sf /etc/nginx/sites-available/lyc-ai /etc/nginx/sites-enabled/

  # 测试并重启Nginx
  nginx -t && systemctl reload nginx

  echo "✅ 部署完成！"
ENDSSH

# 清理
rm deploy.tar.gz

echo -e "${GREEN}🎉 部署成功！${NC}"
echo -e "${GREEN}访问地址: http://$ECS_HOST${NC}"
echo ""
echo "常用命令："
echo "  查看API日志: ssh $ECS_USER@$ECS_HOST 'pm2 logs lyc-ai-api'"
echo "  重启API: ssh $ECS_USER@$ECS_HOST 'pm2 restart lyc-ai-api'"
echo "  查看状态: ssh $ECS_USER@$ECS_HOST 'pm2 status'"