#!/bin/bash

# 数据库迁移脚本 - v1.2.0 (活跃时长统计)
# 添加 role 字段和 user_sessions 表

echo "========================================="
echo "开始数据库迁移 v1.2.0"
echo "========================================="
echo ""

# 检查当前目录
if [ ! -f "package.json" ]; then
  echo "❌ 错误：请在 api 目录下运行此脚本"
  exit 1
fi

# 备份提示
echo "⚠️  重要提示："
echo "1. 此迁移将修改数据库结构"
echo "2. 建议先备份数据库"
echo "3. 迁移内容："
echo "   - 在 users 表添加 role 字段（默认 'user'）"
echo "   - 创建 user_sessions 表（记录用户活跃时长）"
echo ""

read -p "是否继续？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ 迁移已取消"
  exit 1
fi

echo ""
echo "📝 生成 Prisma 迁移文件..."
npx prisma migrate dev --name add_user_sessions_and_role

if [ $? -ne 0 ]; then
  echo "❌ 迁移失败！"
  exit 1
fi

echo ""
echo "✅ 数据库迁移成功！"
echo ""
echo "📊 迁移完成后的数据库结构："
echo "  - users 表新增 role 字段"
echo "  - 新增 user_sessions 表"
echo ""
echo "🔄 下一步："
echo "1. 重新生成 Prisma Client: npx prisma generate"
echo "2. 重启 API 服务: pm2 restart api"
echo "3. 测试新功能是否正常工作"
echo ""

# 自动生成 Prisma Client
echo "🔄 重新生成 Prisma Client..."
npx prisma generate

if [ $? -eq 0 ]; then
  echo "✅ Prisma Client 生成成功！"
else
  echo "⚠️  Prisma Client 生成失败，请手动运行: npx prisma generate"
fi

echo ""
echo "========================================="
echo "迁移完成！"
echo "========================================="
