#!/bin/bash

echo "修复数据库问题..."

expect -c '
set timeout 120
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"
send "cd /var/www/lyc-ai/api\r"
expect "root@*"
send "npx prisma db push\r"
expect "root@*"
send "npx prisma generate\r"
expect "root@*"
send "pm2 restart lyc-ai-api\r"
expect "root@*"
send "ls -la dev.db\r"
expect "root@*"
send "pm2 logs lyc-ai-api --lines 10 --nostream\r"
expect "root@*"
send "exit\r"
expect eof
'

echo "数据库修复完成！"