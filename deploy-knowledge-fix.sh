#!/bin/bash

echo "部署知识库修复到服务器..."

# 1. 打包需要更新的文件
tar -czf knowledge-fix.tar.gz \
  api/src/services/documentParser.ts \
  api/src/routes/conversations.ts \
  api/src/routes/kb.ts \
  web/src/pages/Chat.vue

echo "文件打包完成"

# 2. 上传到服务器 (需要您手动执行)
echo "请执行以下命令上传到服务器："
echo "scp knowledge-fix.tar.gz root@120.24.22.244:/root/"
echo ""
echo "然后在服务器上执行："
echo "cd /root && tar -xzf knowledge-fix.tar.gz"
echo "pm2 restart api"
echo "pm2 restart web"