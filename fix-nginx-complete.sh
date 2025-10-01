#!/bin/bash

echo "=== 彻底修复 Nginx 文件上传限制 ==="

# 连接服务器并彻底重建配置
expect -c '
set timeout 300
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"

# 1. 先检查当前配置
send "echo \"===== 当前 Nginx 配置状态 =====\"\r"
expect "root@*"
send "nginx -V 2>&1 | grep -o with-http\r"
expect "root@*"
send "ls -la /etc/nginx/sites-enabled/\r"
expect "root@*"

# 2. 备份现有配置
send "cp -r /etc/nginx /etc/nginx.bak.$(date +%s)\r"
expect "root@*"

# 3. 创建全新的主配置文件
send "cat > /etc/nginx/nginx.conf << '\''NGINX_MAIN'\''
user www-data;
worker_processes auto;
pid /run/nginx.pid;
error_log /var/log/nginx/error.log;

events {
    worker_connections 768;
}

http {
    # 全局文件大小限制
    client_max_body_size 100M;
    client_body_buffer_size 100M;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;

    gzip on;

    # 包含站点配置
    include /etc/nginx/sites-enabled/*;
}
NGINX_MAIN\r"
expect "root@*"

# 4. 删除旧的站点配置
send "rm -f /etc/nginx/sites-enabled/lyc-ai\r"
expect "root@*"
send "rm -f /etc/nginx/sites-available/lyc-ai\r"
expect "root@*"

# 5. 创建新的站点配置
send "cat > /etc/nginx/sites-available/lyc-ai << '\''SITE_CONFIG'\''
server {
    listen 80;
    server_name 120.24.22.244;

    # 服务器级别文件大小限制
    client_max_body_size 100M;
    client_body_buffer_size 100M;
    client_body_timeout 300;

    # 前端静态文件
    location / {
        root /var/www/lyc-ai/web/dist;
        try_files \$uri \$uri/ /index.html;
        add_header Access-Control-Allow-Origin *;
    }

    # API 代理 - 特别重要的部分
    location /api {
        # 位置级别文件大小限制
        client_max_body_size 100M;
        client_body_buffer_size 100M;

        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 代理缓冲和超时设置
        proxy_request_buffering off;
        proxy_buffering off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;

        # 确保大文件能正确传输
        proxy_max_temp_file_size 0;
    }
}
SITE_CONFIG\r"
expect "root@*"

# 6. 启用站点
send "ln -sf /etc/nginx/sites-available/lyc-ai /etc/nginx/sites-enabled/\r"
expect "root@*"

# 7. 测试配置
send "nginx -t\r"
expect "root@*"

# 8. 重新加载 Nginx（不是 reload，是完全重启）
send "systemctl stop nginx\r"
expect "root@*"
send "systemctl start nginx\r"
expect "root@*"

# 9. 验证配置已生效
send "echo \"===== 验证配置 =====\"\r"
expect "root@*"
send "grep -r client_max_body_size /etc/nginx/ 2>/dev/null\r"
expect "root@*"

# 10. 测试上传端点
send "curl -X POST http://localhost:3001/api/upload/check 2>&1 | head -5\r"
expect "root@*"

# 11. 检查 Nginx 错误日志
send "tail -5 /var/log/nginx/error.log\r"
expect "root@*"

send "echo \"===== 配置完成 =====\"\r"
expect "root@*"
send "echo \"文件大小限制已设置为 100MB\"\r"
expect "root@*"
send "echo \"Nginx 已完全重启\"\r"
expect "root@*"

send "exit\r"
expect eof
'

echo ""
echo "=== 修复完成 ==="
echo "已完全重建 Nginx 配置并设置 100MB 文件限制"
echo "请测试上传功能"