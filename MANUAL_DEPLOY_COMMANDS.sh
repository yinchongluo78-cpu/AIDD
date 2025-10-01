#!/bin/bash

# ========================================
# 手动部署命令 - 请按顺序执行
# ========================================

echo "📦 部署包已准备: deploy-fixed.tar.gz (141MB)"
echo ""
echo "请按以下步骤操作:"
echo ""

# ===== 步骤 1 =====
cat << 'EOF'
1️⃣  上传部署包到服务器
================================
在你的本地终端执行:

scp deploy-fixed.tar.gz root@120.24.22.244:/tmp/

(密码: Lyc001286)

EOF

# ===== 步骤 2 =====
cat << 'EOF'
2️⃣  登录服务器
================================
ssh root@120.24.22.244

(密码: Lyc001286)

EOF

# ===== 步骤 3 =====
cat << 'EOF'
3️⃣  在服务器上执行以下命令
================================
# 切换到项目目录
cd /var/www/lyc-ai

# 备份现有代码(重要!)
tar -czf ../lyc-ai-backup-$(date +%Y%m%d).tar.gz .

# 解压新代码
tar -xzf /tmp/deploy-fixed.tar.gz

# 安装生产依赖
cd api
npm install --production

# 安装ali-oss(新增依赖)
npm install ali-oss

# 返回项目根目录
cd ..

# 更新Nginx配置
sudo cp nginx-production.conf /etc/nginx/conf.d/lyc-ai.conf

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl reload nginx

# 重启API服务
pm2 restart lyc-ai-api

# 如果pm2进程不存在,则启动新进程
pm2 list | grep lyc-ai-api || pm2 start api/dist/index.js --name lyc-ai-api

# 查看服务状态
pm2 list
pm2 logs lyc-ai-api --lines 20 --nostream

# 测试健康检查
curl http://localhost:3001/api/health

EOF

# ===== 步骤 4 =====
cat << 'EOF'
4️⃣  验证部署
================================
在浏览器访问:

http://120.24.22.244

测试以下功能:
✅ 登录功能
✅ 对话功能
✅ 图片上传(测试OCR)
✅ 知识库上传文档
✅ 知识库选择和检索

EOF

# ===== 步骤 5 =====
cat << 'EOF'
5️⃣  查看日志(如有问题)
================================
# 实时查看日志
pm2 logs lyc-ai-api

# 查看最近50行日志
pm2 logs lyc-ai-api --lines 50 --nostream

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log

# 退出日志查看
Ctrl + C

EOF

# ===== 成功标志 =====
cat << 'EOF'
✅ 部署成功标志
================================
1. pm2 list 显示 lyc-ai-api 状态为 online
2. curl http://localhost:3001/api/health 返回 {"ok":true}
3. 浏览器访问正常
4. 日志无错误

EOF

echo ""
echo "========================================"
echo "🎉 准备完成!请开始部署!"
echo "========================================"
echo ""
echo "提示: 如果遇到问题,可以查看 DEPLOYMENT_GUIDE_FINAL.md 的故障排查章节"
echo ""