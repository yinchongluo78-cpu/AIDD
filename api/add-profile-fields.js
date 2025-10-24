const { PrismaClient } = require('@prisma/client')
const prisma = new Prisma Client()

async function addFields() {
  try {
    // 使用 Prisma 的原始 SQL 执行
    await prisma.$executeRawUnsafe(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS has_completed_tutorial BOOLEAN DEFAULT false
    `)

    await prisma.$executeRawUnsafe(`
      ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0
    `)

    console.log('✓ 数据库字段添加成功')
  } catch (error) {
    console.error('添加字段失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addFields()
