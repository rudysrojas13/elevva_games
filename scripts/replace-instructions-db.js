const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function replaceInstructions() {
  try {
    console.log('Replacing provider delivery instructions with ElevvaGame instructions in DB...');

    // 1. Update Demon Slayer (ID: 5346653)
    const dsProduct = await prisma.product.findUnique({
      where: { id: '5346653' }
    });

    if (dsProduct) {
      // Find the start of the block and replace until the end
      // Let's replace the whole instruction block using regex
      const regex = /¡ATENCIÓN![\s\S]*recibamos el CÓDIGO de su parte\./gi;
      const newDesc = dsProduct.description.replace(
        regex,
        '💡 <strong>Instrucciones de Entrega:</strong><br />En ElevvaGame, tus credenciales de acceso se cargan automáticamente en la pestaña <strong>"Mis Pedidos"</strong> una vez completada la compra. Si necesitas ayuda adicional o tienes alguna duda, escríbenos directamente por WhatsApp y te ayudaremos de inmediato.'
      );
      
      await prisma.product.update({
        where: { id: '5346653' },
        data: { description: newDesc }
      });
      console.log('Successfully updated Demon Slayer (ID: 5346653)');
    } else {
      console.log('Demon Slayer product not found by ID: 5346653');
    }

    // 2. Update Gran Turismo 7 (ID: 5216451)
    const gtProduct = await prisma.product.findUnique({
      where: { id: '5216451' }
    });

    if (gtProduct) {
      const regex = /¡ATENCIÓN![\s\S]*no enviaremos los datos de la cuenta\./gi;
      const newDesc = gtProduct.description.replace(
        regex,
        '💡 <strong>Instrucciones de Entrega:</strong><br />En ElevvaGame, tus credenciales de acceso se cargan automáticamente en la pestaña <strong>"Mis Pedidos"</strong> una vez completada la compra. Si necesitas ayuda adicional o tienes alguna duda, escríbenos directamente por WhatsApp y te ayudaremos de inmediato.'
      );
      
      await prisma.product.update({
        where: { id: '5216451' },
        data: { description: newDesc }
      });
      console.log('Successfully updated Gran Turismo 7 (ID: 5216451)');
    } else {
      console.log('Gran Turismo 7 product not found by ID: 5216451');
    }

  } catch (err) {
    console.error('Error during database update:', err);
  } finally {
    await prisma.$disconnect();
  }
}

replaceInstructions();
