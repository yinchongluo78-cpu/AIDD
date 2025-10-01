#!/bin/bash

# 手动部署指南
echo "==================================="
echo "LYC AI 项目手动部署步骤"
echo "==================================="
echo ""
echo "📦 部署包已准备好：deploy.tar.gz (81KB)"
echo ""
echo "📋 请按照以下步骤操作："
echo ""
echo "步骤 1: 上传部署包到服务器"
echo "-------------------------------"
echo "在新的终端窗口执行："
echo ""
echo "scp deploy.tar.gz root@120.24.22.244:/tmp/"
echo "密码: Lyc001286"
echo ""
echo "步骤 2: 登录到服务器"
echo "-------------------------------"
echo "ssh root@120.24.22.244"
echo "密码: Lyc001286"
echo ""
echo "步骤 3: 在服务器上执行部署命令"
echo "-------------------------------"
echo "登录服务器后，复制并执行以下命令："
echo ""
cat << 'DEPLOY_SCRIPT'
# 创建部署目录
mkdir -p /var/www/lyc-ai
cd /var/www/lyc-ai

# 解压文件
tar -xzf /tmp/deploy.tar.gz

# 安装后端依赖
cd api
npm install --production

# 复制生产环境配置
cp .env.production .env

# 生成Prisma客户端
npx prisma generate

# 运行数据库迁移
export DATABASE_URL="postgresql://postgres:Lyc001286@pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com:5432/lyc_ai_db?schema=public"
npx prisma migrate deploy || echo "首次部署，创建数据库表..."
npx prisma db push

# 编译TypeScript
npx tsc

# 配置PM2
pm2 delete lyc-ai-api 2>/dev/null || true
pm2 start dist/index.js --name lyc-ai-api --env production
pm2 save
pm2 startup systemd -u root --hp /root || true

# 配置Nginx
cat > /etc/nginx/sites-available/lyc-ai << 'NGINX'
server {
    listen 80;
    server_name 120.24.22.244;

    # 前端静态文件
    location / {
        root /var/www/lyc-ai/web/dist;
        try_files $uri $uri/ /index.html;
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件夹
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
DEPLOY_SCRIPT

echo ""
echo "==================================="
echo "部署完成后，可以通过以下地址访问："
echo "http://120.24.22.244"
echo ""
echo "常用命令："
echo "  查看API日志: pm2 logs lyc-ai-api"
echo "  重启API: pm2 restart lyc-ai-api"
echo "  查看状态: pm2 status"
echo "==================================="