const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const products = await prisma.product.findMany();
  const orders = await prisma.order.findMany();

  const data = { users, products, orders };
  const outputPath = path.join(__dirname, 'sqlite-export.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log('Exported ' + users.length + ' users, ' + products.length + ' products, ' + orders.length + ' orders to sqlite-export.json');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
