#!/bin/bash

# 知识库错误诊断脚本
# 用于在服务器上诊断 500 错误的根本原因

echo "================================"
echo "知识库错误诊断脚本"
echo "================================"

read -p "输入服务器地址 (例如: root@your-server-ip): " SERVER_ADDR

if [ -z "$SERVER_ADDR" ]; then
    echo "⊘ 未输入服务器地址，退出"
    exit 1
fi

echo ""
echo "连接到服务器并执行诊断..."
echo ""

ssh "$SERVER_ADDR" << 'ENDSSH'
    echo "================================"
    echo "1. 检查 PM2 进程状态"
    echo "================================"
    pm2 list

    echo ""
    echo "================================"
    echo "2. 检查最近的 API 日志（包含知识库相关）"
    echo "================================"
    pm2 logs api --lines 50 --nostream | grep -A 5 -B 5 "kb\|分类\|KnowledgeSelector\|500"

    echo ""
    echo "================================"
    echo "3. 检查数据库连接"
    echo "================================"
    cd /root/lyc2/api
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    async function test() {
        try {
            console.log('测试数据库连接...');
            const users = await prisma.user.findMany({ take: 1 });
            console.log('✓ 数据库连接正常');
            console.log('用户数:', users.length);

            if (users.length > 0) {
                const userId = users[0].id;
                console.log('测试用户ID:', userId);

                const categories = await prisma.kbCategory.findMany({
                    where: { userId: userId },
                    take: 5
                });
                console.log('✓ 知识库分类查询正常');
                console.log('分类数:', categories.length);
            }

            await prisma.\$disconnect();
        } catch (error) {
            console.error('✗ 数据库错误:', error.message);
            console.error('详细信息:', error);
            process.exit(1);
        }
    }

    test();
    "

    echo ""
    echo "================================"
    echo "4. 检查环境变量配置"
    echo "================================"
    cd /root/lyc2/api
    if [ -f .env ]; then
        echo "✓ .env 文件存在"
        echo "关键配置项:"
        grep -E "^(DATABASE_URL|JWT_SECRET|PORT)" .env | sed 's/=.*/=***/' || echo "未找到关键配置"
    else
        echo "✗ .env 文件不存在！"
    fi

    echo ""
    echo "================================"
    echo "5. 检查 Prisma 客户端"
    echo "================================"
    cd /root/lyc2/api
    if [ -d node_modules/.prisma/client ]; then
        echo "✓ Prisma 客户端已生成"
        ls -lh node_modules/.prisma/client/libquery_engine-* 2>/dev/null | head -1
    else
        echo "✗ Prisma 客户端未生成！"
        echo "需要运行: pnpm db:generate"
    fi

    echo ""
    echo "================================"
    echo "6. 测试知识库 API 端点"
    echo "================================"
    echo "获取健康检查..."
    curl -s http://localhost:3000/api/health | head -20

    echo ""
    echo ""
    echo "================================"
    echo "诊断完成"
    echo "================================"
ENDSSH

echo ""
echo "如果发现问题，可以执行以下修复命令："
echo "1. 重新生成 Prisma 客户端: ssh $SERVER_ADDR 'cd /root/lyc2/api && pnpm db:generate'"
echo "2. 重新编译: ssh $SERVER_ADDR 'cd /root/lyc2/api && pnpm build'"
echo "3. 重启服务: ssh $SERVER_ADDR 'pm2 restart all'"
echo ""
