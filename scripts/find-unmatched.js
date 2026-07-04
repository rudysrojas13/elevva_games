const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  const targets = products.filter(p => 
    p.imageUrl.includes('digiseller') || 
    p.imageUrl.includes('mycdn.ink') || 
    p.imageUrl.includes('digiseller.ru')
  );
  
  console.log(`Found ${targets.length} products with Digiseller images:`);
  targets.slice(0, 40).forEach(p => {
    console.log(`- ${p.name}`);
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
