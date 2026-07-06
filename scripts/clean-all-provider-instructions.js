const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanAllProviderInstructions() {
  try {
    console.log('Scanning database for Plati/Digiseller manual delivery instructions...');

    const products = await prisma.product.findMany();
    let updatedCount = 0;

    for (const product of products) {
      const desc = product.description;
      let newDesc = desc;

      // Match the pattern starting with "¡ATENCIÓN! Después del pago, recibirá..." or similar,
      // and ending with "hasta que recibamos el CÓDIGO..." or "no enviaremos los datos de la cuenta."
      // We will match regex for both variants.
      const regex1 = /¡ATENCIÓN![\s\S]*?recibamos el CÓDIGO de su parte\./gi;
      const regex2 = /¡ATENCIÓN![\s\S]*?no enviaremos los datos de la cuenta\./gi;
      const regex3 = /1\)\s*En la página de compra[\s\S]*?ENVIAR MENSAJE\./gi;

      const replacement = '💡 <strong>Instrucciones de Entrega:</strong><br />En ElevvaGame, tus credenciales de acceso se cargan automáticamente en la pestaña <strong>"Mis Pedidos"</strong> una vez completada la compra. Si necesitas ayuda adicional o tienes alguna duda, escríbenos directamente por WhatsApp y te ayudaremos de inmediato.';

      let changed = false;
      if (regex1.test(newDesc)) {
        newDesc = newDesc.replace(regex1, replacement);
        changed = true;
      }
      if (regex2.test(newDesc)) {
        newDesc = newDesc.replace(regex2, replacement);
        changed = true;
      }
      if (regex3.test(newDesc)) {
        newDesc = newDesc.replace(regex3, replacement);
        changed = true;
      }

      if (changed) {
        await prisma.product.update({
          where: { id: product.id },
          data: { description: newDesc }
        });
        updatedCount++;
        console.log(`Cleaned instructions for: ${product.name} (ID: ${product.id})`);
      }
    }

    console.log(`Successfully cleaned provider delivery instructions for ${updatedCount} products!`);
  } catch (err) {
    console.error('Error during instructions cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanAllProviderInstructions();
