const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUser() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash: hashedPassword,
        profile: {
          create: {
            name: '测试用户'
          }
        }
      }
    });
    console.log('用户创建成功:', user.email);
  } catch (error) {
    console.error('创建用户失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
