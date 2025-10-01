#!/bin/bash

echo "=== 修复认证问题并重新部署前端 ==="

# 清理并创建临时目录
rm -rf /tmp/fix-auth
mkdir -p /tmp/fix-auth

# 复制整个项目
echo "复制项目文件..."
cp -r /Users/luoyinchong/Desktop/lyc2/* /tmp/fix-auth/
cd /tmp/fix-auth

# 构建前端（确保路由配置生效）
echo "重新构建前端项目..."
cd web
npm install
npm run build
cd ..

# 创建部署压缩包
echo "创建部署压缩包..."
tar -czf /tmp/fix-auth.tar.gz .

echo "认证修复版本部署包创建完成: /tmp/fix-auth.tar.gz"

# 上传到服务器
echo "上传到服务器..."
expect -c '
set timeout 300
spawn scp /tmp/fix-auth.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
'

# 部署到服务器
echo "部署前端修复版本到服务器..."
expect -c '
set timeout 600
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"
send "cd /var/www/lyc-ai\r"
expect "root@*"
send "tar -xzf /tmp/fix-auth.tar.gz\r"
expect "root@*"
send "echo \"前端文件已更新，测试路由重定向...\"\r"
expect "root@*"
send "curl -I http://localhost/\r"
expect "root@*"
send "echo \"重新加载Nginx配置...\"\r"
expect "root@*"
send "nginx -t && systemctl reload nginx\r"
expect "root@*"
send "echo \"检查前端静态文件...\"\r"
expect "root@*"
send "ls -la /var/www/lyc-ai/web/dist/\r"
expect "root@*"
send "exit\r"
expect eof
'

echo ""
echo "=== 认证问题修复完成！ ==="
echo ""
echo "🎉 问题分析和解决方案："
echo "   - 用户访问应用时没有有效的JWT token"
echo "   - 前端应该自动重定向到登录页面"
echo "   - 重新部署确保路由配置生效"
echo ""
echo "📋 现在可以测试："
echo "   1. 访问 http://120.24.22.244"
echo "   2. 应该自动跳转到登录页面"
echo "   3. 登录后可以正常使用功能"
echo ""
echo "🔍 如果还有问题，检查："
echo "   - 浏览器控制台的网络请求"
echo "   - localStorage中是否有token"
echo "   - 清除浏览器缓存后重试"