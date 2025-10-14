// 设置DATABASE_URL环境变量
process.env.DATABASE_URL = 'postgresql://AIDD:Lyc001286@pgm-wz9ar7chi0iaj54g.pg.rds.aliyuncs.com:5432/myappdb?schema=public';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始添加 custom_instructions 字段...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    // 执行原始 SQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS custom_instructions TEXT;
    `);

    console.log('✅ custom_instructions 字段添加成功！');
  } catch (error) {
    console.error('添加字段失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
