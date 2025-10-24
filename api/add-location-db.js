const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    console.log('开始添加 location 字段到 profiles 表...')
    
    // 使用原始SQL执行迁移
    await prisma.$executeRawUnsafe(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
    `)
    
    console.log('✅ location 字段添加成功！')
    
    // 验证字段是否存在
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'profiles' AND column_name = 'location';
    `)
    
    console.log('验证结果:', result)
    
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
