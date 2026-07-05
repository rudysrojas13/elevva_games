const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
  
  let duplicateGroupsCount = 0;
  let totalDuplicatesToRemove = 0;
  
  console.log('=== Exact Duplicate Products Found ===');
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 1) {
      duplicateGroupsCount++;
      totalDuplicatesToRemove += (items.length - 1);
      console.log(`\nGroup: "${key}" (${items.length} items):`);
      items.forEach(item => {
        console.log(`  - ID: ${item.id} | Name: "${item.name}" | Price: ${item.price}`);
      });
    }
  }
  
  console.log(`\nTotal exact duplicate groups: ${duplicateGroupsCount}`);
  console.log(`Total exact duplicate products to remove: ${totalDuplicatesToRemove}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
