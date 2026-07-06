const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function replaceContactInfo() {
  try {
    console.log('Connecting to database to replace contact phrase in product descriptions...');

    // Find all products containing "Contáctenos por correspondencia"
    const products = await prisma.product.findMany({
      where: {
        description: {
          contains: 'Contáctenos por correspondencia',
          mode: 'insensitive'
        }
      }
    });

    console.log(`Found ${products.length} products containing "Contáctenos por correspondencia" text.`);

    let updatedCount = 0;
    for (const product of products) {
      // Replace "Contáctenos por correspondencia y lo ayudaremos." with "Contáctenos por Whatsapp y lo ayudaremos."
      // We do a case-insensitive regex replace.
      const regex = /Contáctenos por correspondencia y lo ayudaremos/gi;
      
      const newDescription = product.description.replace(
        regex, 
        'Contáctenos por Whatsapp y lo ayudaremos'
      );
      
      await prisma.product.update({
        where: { id: product.id },
        data: { description: newDescription }
      });
      
      updatedCount++;
      console.log(`Updated product contact info: ${product.name} (ID: ${product.id})`);
    }

    console.log(`Successfully updated contact info for ${updatedCount} products in the database!`);
  } catch (err) {
    console.error('Error during database update:', err);
  } finally {
    await prisma.$disconnect();
  }
}

replaceContactInfo();
