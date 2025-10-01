#!/bin/bash

echo "=== 最终修复 Nginx 文件上传限制 ==="

# 直接SSH并修复
expect -c '
set timeout 300
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"

# 更新 /etc/nginx/sites-available/lyc-ai
send "cat > /etc/nginx/sites-available/lyc-ai << '\''NGINX_CONFIG'\''\r"
send "server {\r"
send "    listen 80;\r"
send "    server_name 120.24.22.244;\r"
send "    client_max_body_size 100M;\r"
send "\r"
send "    location / {\r"
send "        root /var/www/lyc-ai/web/dist;\r"
send "        try_files \$uri \$uri/ /index.html;\r"
send "        add_header Access-Control-Allow-Origin *;\r"
send "    }\r"
send "\r"
send "    location /api {\r"
send "        client_max_body_size 100M;\r"
send "        proxy_pass http://localhost:3001;\r"
send "        proxy_http_version 1.1;\r"
send "        proxy_set_header Upgrade \$http_upgrade;\r"
send "        proxy_set_header Connection upgrade;\r"
send "        proxy_set_header Host \$host;\r"
send "        proxy_set_header X-Real-IP \$remote_addr;\r"
send "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\r"
send "        proxy_set_header X-Forwarded-Proto \$scheme;\r"
send "        proxy_cache_bypass \$http_upgrade;\r"
send "        proxy_read_timeout 300;\r"
send "        proxy_connect_timeout 300;\r"
send "        proxy_send_timeout 300;\r"
send "    }\r"
send "}\r"
send "NGINX_CONFIG\r"
expect "root@*"

# 检查配置
send "cat /etc/nginx/sites-available/lyc-ai\r"
expect "root@*"

# 测试配置
send "nginx -t\r"
expect "root@*"

# 重启 Nginx
send "systemctl reload nginx\r"
expect "root@*"

# 验证
send "echo \"===== Nginx 配置已更新 =====\"\r"
expect "root@*"
send "echo \"文件大小限制已设置为 100MB\"\r"
expect "root@*"

send "exit\r"
expect eof
'

echo ""
echo "=== 修复完成 ==="
echo "Nginx已配置100MB文件上传限制"
echo "现在可以上传大文件了"