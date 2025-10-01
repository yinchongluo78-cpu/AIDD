#!/bin/bash

echo "=== 修复文件上传大小限制问题 ==="

# 1. 重新部署后端修复
echo "步骤1: 重新部署后端修复..."
cd /Users/luoyinchong/Desktop/lyc2

# 快速构建
cd web
npm run build &
WEB_PID=$!

cd ../api
npx tsc &
API_PID=$!

# 等待构建完成
wait $WEB_PID $API_PID

cd ..

# 创建部署包
tar -czf /tmp/fix-upload.tar.gz .

# 上传到服务器
echo "步骤2: 上传修复版本到服务器..."
expect -c '
set timeout 60
spawn scp /tmp/fix-upload.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
'

# 部署到服务器并修复Nginx配置
echo "步骤3: 部署并修复Nginx配置..."
expect -c '
set timeout 300
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"

# 部署新代码
send "cd /var/www/lyc-ai\r"
expect "root@*"
send "tar -xzf /tmp/fix-upload.tar.gz\r"
expect "root@*"
send "cd api && npx tsc\r"
expect "root@*"

# 修复Nginx配置 - 添加文件上传大小限制
send "cd /etc/nginx/sites-available/\r"
expect "root@*"
send "cat > lyc-ai << '\''EOF'\''\r"
expect "> "
send "server {\r"
expect "> "
send "    listen 80;\r"
expect "> "
send "    server_name 120.24.22.244;\r"
expect "> "
send "    \r"
expect "> "
send "    # 设置客户端请求体大小限制为100MB\r"
expect "> "
send "    client_max_body_size 100M;\r"
expect "> "
send "    \r"
expect "> "
send "    location / {\r"
expect "> "
send "        root /var/www/lyc-ai/web/dist;\r"
expect "> "
send "        try_files \\$uri \\$uri/ /index.html;\r"
expect "> "
send "        add_header Access-Control-Allow-Origin *;\r"
expect "> "
send "    }\r"
expect "> "
send "    \r"
expect "> "
send "    location /api {\r"
expect "> "
send "        proxy_pass http://localhost:3001;\r"
expect "> "
send "        proxy_http_version 1.1;\r"
expect "> "
send "        proxy_set_header Host \\$host;\r"
expect "> "
send "        proxy_set_header X-Real-IP \\$remote_addr;\r"
expect "> "
send "        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;\r"
expect "> "
send "        \r"
expect "> "
send "        # 设置代理超时时间\r"
expect "> "
send "        proxy_connect_timeout 300s;\r"
expect "> "
send "        proxy_send_timeout 300s;\r"
expect "> "
send "        proxy_read_timeout 300s;\r"
expect "> "
send "    }\r"
expect "> "
send "}\r"
expect "> "
send "EOF\r"
expect "root@*"

# 测试并重新加载Nginx配置
send "nginx -t\r"
expect "root@*"
send "systemctl reload nginx\r"
expect "root@*"

# 重启后端服务
send "cd /var/www/lyc-ai/api\r"
expect "root@*"
send "pm2 restart lyc-ai-api\r"
expect "root@*"

# 检查服务状态
send "pm2 list\r"
expect "root@*"
send "echo \"修复完成！\"\r"
expect "root@*"
send "exit\r"
expect eof
'

echo ""
echo "=== 修复完成！ ==="
echo ""
echo "🎉 文件上传大小限制已修复："
echo "   - 后端: 支持最大100MB文件"
echo "   - Nginx: 支持最大100MB请求体"
echo "   - 前端: 5分钟上传超时"
echo ""
echo "📋 现在可以测试："
echo "   1. 访问 http://120.24.22.244"
echo "   2. 尝试上传50MB的PDF文件"
echo "   3. 查看是否还有413错误"
echo ""
echo "🔍 如果还有问题，查看日志："
echo "   ssh root@120.24.22.244"
echo "   pm2 logs lyc-ai-api"