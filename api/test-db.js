const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('正在测试数据库连接...');
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('✓ 数据库连接成功！');
    console.log('数据库信息:', result);
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('✗ 数据库连接失败:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
