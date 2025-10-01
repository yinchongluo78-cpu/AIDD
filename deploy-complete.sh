#!/bin/bash

echo "===开始部署完整项目到服务器==="

# 1. 构建前端
echo "构建前端..."
cd /Users/luoyinchong/Desktop/lyc2/web
npm run build

# 2. 编译后端
echo "编译后端..."
cd /Users/luoyinchong/Desktop/lyc2/api
npm run build

# 3. 创建部署包
echo "创建部署包..."
cd /Users/luoyinchong/Desktop/lyc2
tar -czf deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='*.sh' \
  --exclude='uploads/*' \
  .

# 4. 上传到服务器
echo "上传文件到服务器..."
expect -c '
set timeout 300
spawn scp /Users/luoyinchong/Desktop/lyc2/deploy.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
'

# 5. 部署到服务器
echo "部署服务..."
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
send "tar -xzf /tmp/deploy.tar.gz\r"
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
send "pm2 start dist/index.js --name lyc-ai-api --env production\r"
expect "root@*"
send "pm2 save\r"
expect "root@*"
send "pm2 list\r"
expect "root@*"
send "exit\r"
expect eof
'

echo "===部署完成!==="
echo "访问地址: http://120.24.22.244"