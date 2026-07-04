const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanTitle(name) {
  let title = name;
  // Remove brackets and parenthetical expressions
  title = title.replace(/\(([^)]+)\)/g, '');
  // Remove console badges like (PS5), (PS4) or suffixes like | Alquiler
  title = title.split(' (PS')[0].split(' | Alquiler')[0].split(' | P2')[0];
  // Remove emojis and special characters
  title = title.replace(/[💳⭐🔥⚡🔰]/g, '');
  // Remove words like "Alquiler", "Rent", "7 días"
  title = title.replace(/Alquiler\s+\d+\s+días/gi, '');
  title = title.replace(/Alquiler/gi, '');
  title = title.replace(/Rent\s+\d+\s+days/gi, '');
  title = title.replace(/Rent/gi, '');
  
  return title.trim().replace(/\s+/g, ' ');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanCovers() {
  console.log('=== Starting Auto Cover Clean-up (Steam API) ===');
  
  const products = await prisma.product.findMany();
  console.log(`Total products in database: ${products.length}`);
  
  const targets = products.filter(p => 
    p.imageUrl.includes('digiseller') || 
    p.imageUrl.includes('mycdn.ink') || 
    p.imageUrl.includes('digiseller.ru')
  );
  
  console.log(`Products with Digiseller covers to clean: ${targets.length}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const cleanName = cleanTitle(p.name);
    console.log(`[${i + 1}/${targets.length}] Cleaning: "${p.name}" -> Search Query: "${cleanName}"`);
    
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanName)}&l=english&cc=US`;
      const res = await fetch(searchUrl);
      const data = await res.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const appid = item.id;
        const libraryCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
        
        // Verify image exists via HEAD request
        const checkRes = await fetch(libraryCoverUrl, { method: 'HEAD' });
        if (checkRes.status === 200) {
          // Update database
          await prisma.product.update({
            where: { id: p.id },
            data: { imageUrl: libraryCoverUrl }
          });
          console.log(`   --> SUCCESS! Set clean Steam cover: ${libraryCoverUrl}`);
          successCount++;
        } else {
          // Fallback to capsule image or header image if library cover is not found
          const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
          const headerCheck = await fetch(headerUrl, { method: 'HEAD' });
          if (headerCheck.status === 200) {
            await prisma.product.update({
              where: { id: p.id },
              data: { imageUrl: headerUrl }
            });
            console.log(`   --> SUCCESS! (Fallback to Header): ${headerUrl}`);
            successCount++;
          } else {
            console.log(`   --> FAILED: Steam cover check returned status ${checkRes.status}`);
            failCount++;
          }
        }
      } else {
        console.log(`   --> NOT FOUND on Steam.`);
        failCount++;
      }
    } catch (err) {
      console.error(`   --> ERROR querying Steam:`, err.message);
      failCount++;
    }
    
    // Throttling to avoid rate limit
    await sleep(200);
  }
  
  console.log(`\n=== Cover Clean-up Completed ===`);
  console.log(`Successfully Updated: ${successCount}`);
  console.log(`Not Found / Failed: ${failCount}`);
}

cleanCovers()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
