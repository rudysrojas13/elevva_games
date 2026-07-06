const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function replaceMegaGame() {
  try {
    console.log('Connecting to database to replace "MegaGame" with "ElevvaGame" in product descriptions...');

    // Find all products where description contains "MegaGame" (case-insensitive)
    const products = await prisma.product.findMany({
      where: {
        description: {
          contains: 'MegaGame',
          mode: 'insensitive'
        }
      }
    });

    console.log(`Found ${products.length} products containing "MegaGame".`);

    let updatedCount = 0;
    for (const product of products) {
      // Replace "MegaGame" with "ElevvaGame" (case-insensitive replace using regex)
      const newDescription = product.description.replace(/MegaGame/gi, 'ElevvaGame');
      
      await prisma.product.update({
        where: { id: product.id },
        data: { description: newDescription }
      });
      
      updatedCount++;
      console.log(`Updated product: ${product.name} (ID: ${product.id})`);
    }

    console.log(`Successfully updated ${updatedCount} products in the database!`);
  } catch (err) {
    console.error('Error during database update:', err);
  } finally {
    await prisma.$disconnect();
  }
}

replaceMegaGame();
