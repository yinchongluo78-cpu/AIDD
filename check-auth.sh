#!/bin/bash

echo "检查服务器认证问题..."

expect -c '
set timeout 60
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"
send "cd /var/www/lyc-ai/api\r"
expect "root@*"
send "pm2 logs lyc-ai-api --lines 50 --nostream\r"
expect "root@*"
send "cat .env | grep JWT_SECRET\r"
expect "root@*"
send "ls -la dev.db\r"
expect "root@*"
send "exit\r"
expect eof
'

echo "检查完成！"