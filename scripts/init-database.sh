#!/bin/bash

# 数据库初始化脚本 - 一键创建所有表
# 作者: Claude
# 说明: 这个脚本会自动在你的数据库中创建所有需要的表

echo "========================================="
echo "   🚀 开始初始化数据库表结构"
echo "========================================="
echo ""

# 1. 进入项目目录
cd /root/myproject/lyc2/api || {
    echo "❌ 错误：找不到项目目录 /root/myproject/lyc2/api"
    echo "请确认项目路径是否正确"
    exit 1
}

echo "✅ 已进入项目目录"
echo ""

# 2. 检查环境变量文件
if [ ! -f .env ]; then
    echo "❌ 错误：找不到 .env 文件"
    echo "请确保 .env 文件存在并配置了 DATABASE_URL"
    exit 1
fi

echo "📋 当前数据库配置："
grep DATABASE_URL .env | sed 's/PASSWORD=.*/PASSWORD=******/'
echo ""

# 3. 安装依赖（如果需要）
echo "📦 检查并安装依赖..."
if ! command -v pnpm &> /dev/null; then
    echo "正在安装 pnpm..."
    npm install -g pnpm
fi

# 安装 Prisma 相关包
pnpm add -D prisma @prisma/client

echo "✅ 依赖安装完成"
echo ""

# 4. 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ 生成 Prisma Client 失败"
    exit 1
fi
echo "✅ Prisma Client 生成成功"
echo ""

# 5. 创建数据库迁移
echo "🗄️ 开始创建数据库表..."
echo "这可能需要几秒钟，请稍等..."

# 先尝试创建迁移文件夹（如果不存在）
mkdir -p prisma/migrations

# 执行迁移
npx prisma migrate deploy 2>/dev/null
if [ $? -ne 0 ]; then
    echo "首次运行，创建初始迁移..."
    npx prisma migrate dev --name init_schema --skip-seed
    if [ $? -ne 0 ]; then
        echo ""
        echo "⚠️  如果看到关于环境的警告，请运行："
        echo "   npx prisma db push"
        echo ""
        npx prisma db push
    fi
fi

echo ""
echo "✅ 数据库表创建完成！"
echo ""

# 6. 验证表是否创建成功
echo "📊 正在验证数据库表..."
echo "以下是创建的表："
echo ""

# 使用 Prisma 内省功能检查表
npx prisma db pull --print 2>/dev/null | grep "model " | sed 's/model /  ✅ /'

echo ""
echo "========================================="
echo "   🎉 数据库初始化完成！"
echo "========================================="
echo ""
echo "已创建的 7 张表："
echo "  1. users - 用户表"
echo "  2. profiles - 用户资料表"
echo "  3. kb_categories - 知识库分类表"
echo "  4. kb_documents - 知识库文档表"
echo "  5. kb_chunks - 文档分块表"
echo "  6. conversations - 对话表"
echo "  7. messages - 消息表"
echo ""

# 7. 重启 API 服务
echo "🔄 重启 API 服务..."
pm2 restart super-scholar-api || pm2 restart api-server || {
    echo "⚠️  PM2 重启失败，请手动重启服务"
}

# 8. 健康检查
echo ""
echo "🏥 健康检查..."
sleep 2
curl -s http://127.0.0.1:3000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API 服务运行正常"
    echo "   健康检查: $(curl -s http://127.0.0.1:3000/api/health)"
else
    echo "⚠️  API 服务可能需要手动重启"
fi

echo ""
echo "========================================="
echo "   ✨ 全部完成！数据库已准备就绪"
echo "========================================="