#!/bin/bash

echo "开始部署前端..."

# 使用expect脚本上传前端文件
expect << 'EOF'
set timeout 300
spawn scp web-dist-fixed.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
EOF

# 连接服务器并解压部署
expect << 'EOF'
set timeout 300
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"
send "cd /var/www/lyc-ai\r"
expect "root@*"
send "rm -rf web\r"
expect "root@*"
send "mkdir web\r"
expect "root@*"
send "cd web\r"
expect "root@*"
send "tar -xzf /tmp/web-dist-fixed.tar.gz\r"
expect "root@*"
send "ls -la dist/\r"
expect "root@*"
send "systemctl reload nginx\r"
expect "root@*"
send "exit\r"
expect eof
EOF

echo "前端部署完成！"