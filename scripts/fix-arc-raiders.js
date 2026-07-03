const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { name: { contains: 'ARC' } }
  });

  if (products.length === 0) {
    console.log('❌ No se encontró el producto ARC Raiders');
    return;
  }

  const product = products[0];
  console.log('✅ Producto encontrado:', product.name);

  // Correct options prices to divide by 1000 (standard DB convention)
  const newOptions = JSON.stringify([
    { label: 'P2 - Cuenta Secundaria (Standard)', price: 53, costUsd: 10.91 },
    { label: 'P2 - Cuenta Secundaria (Deluxe)', price: 91, costUsd: 18.91 },
    { label: 'P1 - Cuenta Primaria (Standard)', price: 115, costUsd: 23.91 },
    { label: 'P1 - Cuenta Primaria (Deluxe)', price: 153, costUsd: 31.91 },
  ]);

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: {
      options: newOptions,
      price: 53, // 53 instead of 53000
    }
  });

  console.log('🎉 ARC Raiders prices updated to standard DB convention (divided by 1000)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
