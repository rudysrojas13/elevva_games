const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Starting Account Titles Clean-up ===');
  
  const products = await prisma.product.findMany({});
  let updatedCount = 0;

  for (const p of products) {
    const name = p.name || '';
    
    // Check if the product has "| Alquiler" at the end
    if (name.endsWith('| Alquiler')) {
      const lowerName = name.toLowerCase();
      
      // Keywords that signify it is a complete account rather than a simple rental
      const isAccount = lowerName.includes('p1') || 
                        lowerName.includes('p2') || 
                        lowerName.includes('p3') || 
                        lowerName.includes('activacion') || 
                        lowerName.includes('activation') || 
                        lowerName.includes('offline') || 
                        lowerName.includes('sin conexion') || 
                        lowerName.includes('sin conexion') || 
                        lowerName.includes('sin conexión') ||
                        lowerName.includes('completa');

      if (isAccount) {
        // Replace "| Alquiler" suffix with "| Cuenta Completa"
        const newName = name.substring(0, name.lastIndexOf('| Alquiler')).trim() + ' | Cuenta Completa';
        
        await prisma.product.update({
          where: { id: p.id },
          data: { name: newName }
        });
        
        console.log(`  --> UPDATED: "${name}" \n            -> "${newName}"`);
        updatedCount++;
      }
    }
  }

  console.log(`\n=== Clean-up Completed ===`);
  console.log(`Total Products Updated: ${updatedCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
