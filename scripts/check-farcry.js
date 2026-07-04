const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Far Cry',
        mode: 'insensitive'
      }
    }
  });
  
  console.log(`Found ${products.length} Far Cry products:`);
  products.forEach(p => {
    console.log(`- ID: ${p.id}`);
    console.log(`  Name: ${p.name}`);
    console.log(`  Image: ${p.imageUrl}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
