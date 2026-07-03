const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  console.log('Total products in DB:', count);
  const activeCount = await prisma.product.count({ where: { active: true } });
  console.log('Active products in DB:', activeCount);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
