#!/bin/bash

# 前端部署脚本 - 一键部署 Vue 应用
# 作者: Claude
# 说明: 这个脚本会自动构建并部署前端到 Nginx

echo "========================================="
echo "   🚀 开始部署前端应用"
echo "========================================="
echo ""

# 1. 进入项目目录
cd /root/myproject/lyc2/web || {
    echo "❌ 错误：找不到项目目录 /root/myproject/lyc2/web"
    echo "请确认项目路径是否正确"
    exit 1
}

echo "✅ 已进入前端项目目录"
echo ""

# 2. 创建环境变量文件
echo "📝 配置前端环境变量..."
cat > .env << EOF
# API 后端地址
VITE_API_BASE=http://127.0.0.1:3000
EOF

echo "✅ 环境变量配置完成"
echo ""

# 3. 安装依赖
echo "📦 安装前端依赖..."
if ! command -v pnpm &> /dev/null; then
    echo "正在安装 pnpm..."
    npm install -g pnpm
fi

pnpm install
if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装完成"
echo ""

# 4. 构建前端项目
echo "🔨 开始构建前端..."
pnpm build
if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败"
    exit 1
fi

echo "✅ 前端构建完成"
echo ""

# 5. 安装 Nginx（如果没有安装）
echo "🌐 检查 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "正在安装 Nginx..."
    yum install -y nginx
    systemctl enable nginx
fi

echo "✅ Nginx 已准备就绪"
echo ""

# 6. 部署到 Nginx
echo "📂 部署前端文件到 Nginx..."

# 创建网站目录
mkdir -p /usr/share/nginx/html/web

# 复制构建文件
cp -r dist/* /usr/share/nginx/html/web/

echo "✅ 前端文件已部署"
echo ""

# 7. 配置 Nginx
echo "⚙️  配置 Nginx..."

# 备份默认配置
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup 2>/dev/null

# 创建网站配置
cat > /etc/nginx/conf.d/super-scholar.conf << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    location / {
        root /usr/share/nginx/html/web;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "✅ Nginx 配置完成"
echo ""

# 8. 重启 Nginx
echo "🔄 重启 Nginx..."
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo "✅ Nginx 重启成功"
else
    echo "❌ Nginx 配置有误，请检查"
    exit 1
fi

echo ""

# 9. 配置防火墙
echo "🔥 配置防火墙..."
# 检查是否使用 firewalld
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "✅ 防火墙已配置"
else
    echo "⚠️  未检测到 firewalld，请手动配置防火墙"
fi

echo ""

# 10. 获取服务器 IP
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo "========================================="
echo "   ✨ 前端部署完成！"
echo "========================================="
echo ""
echo "📱 访问地址："
echo "   http://${SERVER_IP}"
echo ""
echo "📊 部署信息："
echo "   - 前端目录: /usr/share/nginx/html/web"
echo "   - Nginx 配置: /etc/nginx/conf.d/super-scholar.conf"
echo "   - API 地址: http://127.0.0.1:3000"
echo ""
echo "💡 提示："
echo "   1. 请确保阿里云安全组已开放 80 端口"
echo "   2. 如需 HTTPS，请配置 SSL 证书"
echo "   3. 可以使用域名替代 IP 访问"
echo ""
echo "========================================="