const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getBaseTitle(name) {
  let title = name.toLowerCase();
  
  // Remove accents
  title = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Remove console tags (with or without parentheses)
  title = title.replace(/\(ps4\)/g, '').replace(/\(ps5\)/g, '');
  title = title.replace(/ps4|ps5/g, '');
  
  // Remove suffix indicators
  title = title.replace(/\| alquiler/g, '');
  title = title.replace(/\| cuenta completa/g, '');
  title = title.replace(/\| p2\/p3/g, '');
  title = title.replace(/\| p2-p3/g, '');
  
  // Remove emojis
  title = title.replace(/[🎮💳⭐🔥⚡🔰🟢✨]/g, '');
  
  // Remove common phrases
  title = title.replace(/alquiler\s+\d+\s+dias/g, '');
  title = title.replace(/alquiler/g, '');
  title = title.replace(/rent\s+\d+\s+days/g, '');
  title = title.replace(/rent/g, '');
  title = title.replace(/activacion/g, '');
  title = title.replace(/sin conexion/g, '');
  title = title.replace(/sin conexion/g, '');
  title = title.replace(/sin conexion/g, '');
  title = title.replace(/p1-sin conexion/g, '');
  title = title.replace(/p1/g, '');
  title = title.replace(/p2/g, '');
  title = title.replace(/p3/g, '');
  title = title.replace(/offline/g, '');
  title = title.replace(/online/g, '');
  
  // Clean extra spaces
  title = title.replace(/[^a-z0-9]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  
  return title;
}

function getProductClass(name) {
  const lower = name.toLowerCase();
  
  // 1. P1 / Offline / Sin conexión
  if (lower.includes('p1') || lower.includes('offline') || lower.includes('sin conexion') || lower.includes('sin conexión')) {
    return 'offline';
  }
  
  // 2. Rental
  if (lower.includes('alquiler 7') || lower.includes('alquiler desde') || lower.includes('rent 7') || lower.includes('rent desde')) {
    return 'rental';
  }
  
  // 3. Online Account (P2, P3, P2/P3)
  if (lower.includes('p2') || lower.includes('p3') || lower.includes('activacion') || lower.includes('activation') || lower.includes('cuenta completa')) {
    return 'account';
  }
  
  return 'other';
}

async function main() {
  console.log('=== Starting Redundant Accounts Curation (V2) ===');
  
  const products = await prisma.product.findMany({
    where: { active: true }
  });

  // Group by base title + category
  const groups = {};
  for (const p of products) {
    const base = getBaseTitle(p.name);
    const key = `${base}_${p.category}`;
    if (!groups[key]) {
      groups[key] = {
        base,
        category: p.category,
        rental: [],
        offline: [],
        account: [],
        other: []
      };
    }
    const cls = getProductClass(p.name);
    groups[key][cls].push(p);
  }

  let totalDeleted = 0;
  let totalDeactivated = 0;

  for (const [key, group] of Object.entries(groups)) {
    // We only perform redundancy checks inside the "account" array of each game
    if (group.account.length > 1) {
      console.log(`\nAnalyzing group: "${group.base}" (${group.category})`);
      
      // Sort accounts by "completeness":
      // 1. Has "p2/p3" or "p2-p3" in name
      // 2. Has more options in options array
      // 3. Cheaper price as tie breaker
      group.account.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aHasBoth = aName.includes('p2/p3') || aName.includes('p2-p3') || aName.includes('| p2/p3') || aName.includes('| p2-p3') || aName.includes('p2-p3');
        const bHasBoth = bName.includes('p2/p3') || bName.includes('p2-p3') || bName.includes('| p2/p3') || bName.includes('| p2-p3') || bName.includes('p2-p3');
        
        if (aHasBoth && !bHasBoth) return -1;
        if (!aHasBoth && bHasBoth) return 1;
        
        const aOpts = JSON.parse(a.options || '[]');
        const bOpts = JSON.parse(b.options || '[]');
        if (aOpts.length !== bOpts.length) {
          return bOpts.length - aOpts.length; // More options first
        }
        
        return a.price - b.price; // Cheaper first
      });

      const toKeep = group.account[0];
      const redundancies = group.account.slice(1);
      
      console.log(`  --> KEEPING most complete: "${toKeep.name}" (ID: ${toKeep.id}, Price: $${toKeep.price}.000, Variants: ${JSON.parse(toKeep.options || '[]').length})`);
      
      for (const red of redundancies) {
        // Check for orders
        const ordersCount = await prisma.order.count({
          where: { productId: red.id }
        });
        
        if (ordersCount > 0) {
          await prisma.product.update({
            where: { id: red.id },
            data: { active: false }
          });
          console.log(`  --> DEACTIVATED (redundant with orders): "${red.name}" (ID: ${red.id}, Price: $${red.price}.000)`);
          totalDeactivated++;
        } else {
          await prisma.product.delete({
            where: { id: red.id }
          });
          console.log(`  --> DELETED (redundant, no orders): "${red.name}" (ID: ${red.id}, Price: $${red.price}.000)`);
          totalDeleted++;
        }
      }
    }
  }

  console.log(`\n=== Curation Completed ===`);
  console.log(`Total Redundant Products Deleted: ${totalDeleted}`);
  console.log(`Total Redundant Products Deactivated: ${totalDeactivated}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
