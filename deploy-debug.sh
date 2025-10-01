#!/bin/bash

echo "=== 开始创建调试版本部署包 ==="

# 清理并创建临时目录
rm -rf /tmp/deploy-debug
mkdir -p /tmp/deploy-debug

# 复制整个项目
echo "复制项目文件..."
cp -r /Users/luoyinchong/Desktop/lyc2/* /tmp/deploy-debug/
cd /tmp/deploy-debug

# 构建前端
echo "构建前端项目..."
cd web
npm install
npm run build
cd ..

# 编译后端
echo "编译后端项目..."
cd api
npm install
npx tsc
cd ..

# 创建部署压缩包
echo "创建部署压缩包..."
tar -czf /tmp/deploy-debug.tar.gz .

echo "调试版本部署包创建完成: /tmp/deploy-debug.tar.gz"

# 上传到服务器
echo "上传到服务器..."
expect -c '
set timeout 300
spawn scp /tmp/deploy-debug.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
'

# 部署到服务器
echo "部署到服务器..."
expect -c '
set timeout 600
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"
send "cd /var/www\r"
expect "root@*"
send "rm -rf lyc-ai.bak\r"
expect "root@*"
send "if [ -d lyc-ai ]; then mv lyc-ai lyc-ai.bak; fi\r"
expect "root@*"
send "mkdir -p lyc-ai\r"
expect "root@*"
send "cd lyc-ai\r"
expect "root@*"
send "tar -xzf /tmp/deploy-debug.tar.gz\r"
expect "root@*"
send "cd api\r"
expect "root@*"
send "npm install --production\r"
expect "root@*"
send "npx prisma generate\r"
expect "root@*"
send "npx prisma db push\r"
expect "root@*"
send "pm2 delete lyc-ai-api 2>/dev/null || true\r"
expect "root@*"
send "pm2 start dist/index.js --name lyc-ai-api\r"
expect "root@*"
send "pm2 save\r"
expect "root@*"
send "echo \"部署完成！\"\r"
expect "root@*"
send "pm2 logs lyc-ai-api --lines 10 --nostream\r"
expect "root@*"
send "exit\r"
expect eof
'

echo "=== 调试版本部署完成 ==="
echo "请访问 http://120.24.22.244 测试功能"
echo "服务器日志可通过以下命令查看："
echo "ssh root@120.24.22.244"
echo "pm2 logs lyc-ai-api"