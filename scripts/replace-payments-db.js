const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function replacePayments() {
  try {
    console.log('Connecting to database to replace payment methods in product descriptions...');

    // Find all products containing "Para el pago puede utilizar"
    const products = await prisma.product.findMany({
      where: {
        description: {
          contains: 'Para el pago puede utilizar',
          mode: 'insensitive'
        }
      }
    });

    console.log(`Found ${products.length} products containing payment methods text.`);

    let updatedCount = 0;
    for (const product of products) {
      // Regex matches "Para el pago puede utilizar" and everything after it on the same line
      // until a period or newline is found.
      const regex = /Para el pago puede utilizar[^.\n]*/gi;
      
      const newDescription = product.description.replace(
        regex, 
        'Para el pago puede utilizar PayPal, Nequi, Bancolombia, Binance'
      );
      
      await prisma.product.update({
        where: { id: product.id },
        data: { description: newDescription }
      });
      
      updatedCount++;
      console.log(`Updated product payments: ${product.name} (ID: ${product.id})`);
    }

    console.log(`Successfully updated payments text for ${updatedCount} products in the database!`);
  } catch (err) {
    console.error('Error during database update:', err);
  } finally {
    await prisma.$disconnect();
  }
}

replacePayments();
