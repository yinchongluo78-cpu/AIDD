const { PrismaClient } = require('@prisma/client');

async function createUser() {
  const prisma = new PrismaClient();
  try {
    // 简单的密码哈希（仅用于测试）
    const passwordHash = '$2b$10$K7L/8Y1t85jzrTI6.UWUYO2aHXM3ne7qvUzm.OdEfxdTC2b2Rw.4e'; // 对应密码 "123456"
    
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: passwordHash,
        profile: {
          create: {
            location: ''
          }
        }
      },
      include: {
        profile: true
      }
    });
    console.log('用户创建成功:', user);
  } catch (error) {
    console.error('创建用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();