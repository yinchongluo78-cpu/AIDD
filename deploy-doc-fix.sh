#!/bin/bash

echo "=== 部署文档修复方案 ==="

# 1. 构建前端
echo "步骤1: 构建前端..."
cd /Users/luoyinchong/Desktop/lyc2/web
npm run build
if [ $? -ne 0 ]; then
  echo "前端构建失败!"
  exit 1
fi

# 2. 构建后端
echo "步骤2: 构建后端..."
cd /Users/luoyinchong/Desktop/lyc2/api
npm run build
if [ $? -ne 0 ]; then
  echo "后端构建失败!"
  exit 1
fi

# 3. 打包文件
echo "步骤3: 创建部署包..."
cd /Users/luoyinchong/Desktop/lyc2
tar -czf /tmp/deploy-doc-fix.tar.gz \
  web/dist \
  api/dist \
  api/package*.json \
  api/prisma \
  api/.env.production

# 4. 上传到服务器
echo "步骤4: 上传到服务器..."
expect -c '
set timeout 300
spawn scp /tmp/deploy-doc-fix.tar.gz root@120.24.22.244:/tmp/
expect "password:"
send "Lyc001286\r"
expect eof
'

# 5. 在服务器上部署
echo "步骤5: 部署到服务器..."
expect -c '
set timeout 600
spawn ssh root@120.24.22.244
expect "password:"
send "Lyc001286\r"
expect "root@*"

# 解压文件
send "cd /var/www/lyc-ai\r"
expect "root@*"
send "tar -xzf /tmp/deploy-doc-fix.tar.gz\r"
expect "root@*"

# 安装依赖
send "cd api\r"
expect "root@*"
send "npm install --production\r"
expect "root@*"

# 配置环境
send "cp .env.production .env\r"
expect "root@*"

# 生成Prisma客户端
send "npx prisma generate\r"
expect "root@*"

# 重启后端服务
send "pm2 restart lyc-ai-api\r"
expect "root@*"
send "pm2 logs lyc-ai-api --lines 5 --nostream\r"
expect "root@*"

# 测试服务
send "curl -s http://localhost:3001/api/health | head -5\r"
expect "root@*"

send "echo \"====================\"\r"
expect "root@*"
send "echo \"部署完成！\"\r"
expect "root@*"
send "echo \"修复的问题：\"\r"
expect "root@*"
send "echo \"1. 文档类型null引用错误\"\r"
expect "root@*"
send "echo \"2. 本地上传文件显示问题\"\r"
expect "root@*"
send "echo \"3. 知识库文档读取问题\"\r"
expect "root@*"
send "echo \"\"\r"
expect "root@*"
send "echo \"请访问 http://120.24.22.244 测试以下功能：\"\r"
expect "root@*"
send "echo \"- 选择知识库文档进行对话\"\r"
expect "root@*"
send "echo \"- 本地上传文档\"\r"
expect "root@*"
send "echo \"- 确认文档图标正常显示\"\r"
expect "root@*"

send "exit\r"
expect eof
'

echo ""
echo "部署脚本执行完成！"
echo "请访问 http://120.24.22.244 测试所有文档功能"