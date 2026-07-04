const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const updates = [
    {
      nameContains: 'La Bestia',
      url: 'https://cdn.akamai.steamstatic.com/steam/apps/2525710/library_600x900.jpg' // Dying Light: The Beast
    },
    {
      nameContains: 'Resident evil 8 village',
      url: 'https://cdn.akamai.steamstatic.com/steam/apps/1196590/library_600x900.jpg' // Resident Evil Village
    },
    {
      nameContains: 'Guerra Fría',
      url: 'https://cdn.akamai.steamstatic.com/steam/apps/1985810/library_600x900.jpg' // Call of Duty: Black Ops Cold War
    }
  ];

  for (const item of updates) {
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: item.nameContains,
          mode: 'insensitive'
        }
      }
    });

    console.log(`Found ${products.length} products matching "${item.nameContains}"`);
    for (const p of products) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: item.url }
      });
      console.log(`Updated "${p.name}" to clean cover: ${item.url}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
