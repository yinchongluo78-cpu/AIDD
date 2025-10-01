#!/bin/bash

echo "=== 检查服务器状态 ==="
echo ""

echo "1. 检查Node.js进程和端口："
echo "--------------------------------"
ps aux | grep node | grep -v grep

echo ""
echo "2. 检查监听的端口："
echo "--------------------------------"
netstat -tlnp | grep -E ':(3000|3001|80|443)'

echo ""
echo "3. 检查PM2进程："
echo "--------------------------------"
pm2 list

echo ""
echo "4. 检查Nginx配置："
echo "--------------------------------"
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/* 2>/dev/null | grep -E 'server_name|proxy_pass|listen'

echo ""
echo "5. 检查内存和CPU使用："
echo "--------------------------------"
free -h
top -bn1 | head -5

echo ""
echo "6. 检查磁盘空间："
echo "--------------------------------"
df -h /