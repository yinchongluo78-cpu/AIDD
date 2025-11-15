const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
    take: 5
  });
  console.log(`用户总数: ${userCount}`);
  console.log('前5个用户:', JSON.stringify(users, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
