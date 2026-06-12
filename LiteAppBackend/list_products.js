const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProducts() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      img: true
    }
  });
  console.log(JSON.stringify(products, null, 2));
}

listProducts().finally(() => prisma.$disconnect());
