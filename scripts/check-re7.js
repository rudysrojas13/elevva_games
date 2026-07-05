const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Resident Evil 7',
        mode: 'insensitive'
      }
    }
  });

  console.log(`Found ${products.length} products matching "Resident Evil 7":`);
  products.forEach(p => {
    console.log(`- ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Category: ${p.category}`);
    console.log(`  Price: ${p.price}`);
    console.log(`  Active: ${p.active}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
