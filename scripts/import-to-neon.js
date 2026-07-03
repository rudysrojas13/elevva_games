const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'sqlite-export.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const { users, products, orders } = data;

  console.log('🌱 Importing data to Neon Postgres...');

  // Insert users
  let userCount = 0;
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        balance: user.balance,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
      },
    });
    userCount++;
    console.log('  ✅ User: ' + user.name + ' (' + user.role + ')');
  }

  // Insert products
  let productCount = 0;
  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        options: product.options,
        category: product.category,
        imageUrl: product.imageUrl,
        stock: product.stock,
        active: product.active,
        costUsd: product.costUsd,
        trm: product.trm,
        markupPercent: product.markupPercent,
        createdAt: new Date(product.createdAt),
        updatedAt: new Date(product.updatedAt),
      },
    });
    productCount++;
    console.log('  ✅ Product: ' + product.name);
  }

  // Insert orders
  let orderCount = 0;
  for (const order of orders) {
    await prisma.order.upsert({
      where: { id: order.id },
      update: {},
      create: {
        id: order.id,
        userId: order.userId,
        productId: order.productId,
        total: order.total,
        status: order.status,
        credentials: order.credentials,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
      },
    });
    orderCount++;
    console.log('  ✅ Order: ' + order.id.substring(0, 8) + ' - ' + order.status);
  }

  console.log('\n🎉 Migration complete!');
  console.log('   ' + userCount + ' users');
  console.log('   ' + productCount + ' products');
  console.log('   ' + orderCount + ' orders');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e.message);
    prisma.$disconnect();
    process.exit(1);
  });
