const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Starting Exact Duplicate Clean-up ===');
  
  const products = await prisma.product.findMany({
    where: { active: true }
  });
  
  // Group by exact name (lowercased) + category
  const groups = {};
  for (const p of products) {
    const key = `${p.name.trim().toLowerCase()}_${p.category}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(p);
  }
  
  let totalDeleted = 0;
  let totalDeactivated = 0;

  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      console.log(`\nProcessing duplicate group: "${key}" (${items.length} items)`);
      
      // Sort by price ascending (cheapest first)
      items.sort((a, b) => a.price - b.price);
      
      const toKeep = items[0];
      console.log(`  --> KEEPING cheapest: "${toKeep.name}" (ID: ${toKeep.id}, Price: ${toKeep.price})`);
      
      // Deleting the rest
      const duplicates = items.slice(1);
      for (const dup of duplicates) {
        // Check if there are orders for this duplicate
        const ordersCount = await prisma.order.count({
          where: { productId: dup.id }
        });
        
        if (ordersCount > 0) {
          // Soft delete
          await prisma.product.update({
            where: { id: dup.id },
            data: { active: false }
          });
          console.log(`  --> DEACTIVATED (has ${ordersCount} orders): "${dup.name}" (ID: ${dup.id}, Price: ${dup.price})`);
          totalDeactivated++;
        } else {
          // Hard delete
          await prisma.product.delete({
            where: { id: dup.id }
          });
          console.log(`  --> DELETED: "${dup.name}" (ID: ${dup.id}, Price: ${dup.price})`);
          totalDeleted++;
        }
      }
    }
  }
  
  console.log(`\n=== Duplicate Clean-up Completed ===`);
  console.log(`Total Products Deleted: ${totalDeleted}`);
  console.log(`Total Products Deactivated: ${totalDeactivated}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
