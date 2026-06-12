const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      phone: true,
      role: true,
      name: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

listUsers().finally(() => prisma.$disconnect());
