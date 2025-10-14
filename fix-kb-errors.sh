#!/bin/bash

# 知识库错误修复部署脚本
# 用于将修复后的代码部署到服务器

set -e

echo "================================"
echo "知识库错误修复部署脚本"
echo "================================"

# 1. 确保我们在项目根目录
cd "$(dirname "$0")"

# 2. 编译后端代码
echo ""
echo "[1/6] 编译后端代码..."
cd api
pnpm build
cd ..

echo ""
echo "[2/6] 检查修改的文件..."
git status

echo ""
echo "[3/6] 提交修改..."
read -p "是否提交修改到 git? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add api/src/routes/kb.ts
    git commit -m "修复知识库API错误：添加详细错误日志和参数验证

- 在获取分类列表接口添加 userId 验证和详细日志
- 在获取分类文档接口添加参数验证和错误详情
- 改进错误响应，包含具体错误信息
- 帮助诊断 500 错误的根本原因

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "✓ 代码已提交"
else
    echo "⊘ 跳过提交"
fi

echo ""
echo "[4/6] 准备部署到服务器..."
echo "请确保你已经配置了服务器的 SSH 访问"
echo ""
read -p "输入服务器地址 (例如: root@your-server-ip): " SERVER_ADDR

if [ -z "$SERVER_ADDR" ]; then
    echo "⊘ 未输入服务器地址，取消部署"
    exit 1
fi

echo ""
echo "[5/6] 上传修改的文件到服务器..."
# 上传修改的路由文件
scp api/src/routes/kb.ts "$SERVER_ADDR:/root/lyc2/api/src/routes/"

echo ""
echo "[6/6] 在服务器上重新编译和重启服务..."
ssh "$SERVER_ADDR" << 'ENDSSH'
    cd /root/lyc2/api
    echo "重新编译..."
    pnpm build
    echo "重启 PM2 服务..."
    pm2 restart all
    echo "查看日志..."
    pm2 logs --lines 20
ENDSSH

echo ""
echo "================================"
echo "✓ 部署完成！"
echo "================================"
echo ""
echo "接下来的步骤："
echo "1. 在浏览器中刷新页面"
echo "2. 打开控制台（F12）查看网络请求"
echo "3. 通过 SSH 连接服务器查看详细日志："
echo "   ssh $SERVER_ADDR"
echo "   pm2 logs api --lines 50"
echo ""
