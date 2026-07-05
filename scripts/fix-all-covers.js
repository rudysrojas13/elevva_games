const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getCleanBaseTitle(name) {
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
  
  // Remove activation/rental phrases
  title = title.replace(/alquiler\s+\d+\s+dias/g, '');
  title = title.replace(/alquiler/g, '');
  title = title.replace(/rent\s+\d+\s+days/g, '');
  title = title.replace(/rent/g, '');
  title = title.replace(/activacion/g, '');
  title = title.replace(/activation/g, '');
  title = title.replace(/sin conexion/g, '');
  title = title.replace(/sin conexion/g, '');
  title = title.replace(/sin conexión/g, '');
  title = title.replace(/p1-sin conexion/g, '');
  title = title.replace(/p1/g, '');
  title = title.replace(/p2/g, '');
  title = title.replace(/p3/g, '');
  title = title.replace(/offline/g, '');
  title = title.replace(/online/g, '');
  title = title.replace(/en linea/g, '');
  
  // Remove numbers like 7 dias
  title = title.replace(/\b\d+\s+dias\b/g, '');
  title = title.replace(/\b7\s+dias\b/g, '');
  
  // Remove extra characters and clean spaces
  title = title.replace(/[^a-z0-9]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  
  return title;
}

async function getSteamCover(cleanName) {
  try {
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanName)}&l=english&cc=US`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const appid = item.id;
      const libraryCoverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`;
      const checkRes = await fetch(libraryCoverUrl, { method: 'HEAD' });
      if (checkRes.status === 200) return libraryCoverUrl;
    }
  } catch (err) {}
  return null;
}

async function getBingCover(cleanName) {
  try {
    const query = `${cleanName} vertical poster`;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const regex = /<img[^>]+class="mimg"[^>]+src="([^"]+)"/i;
    const match = html.match(regex);
    let imgUrl = null;
    if (match) imgUrl = match[1];
    if (imgUrl) {
      let cleanUrl = imgUrl.replace(/&amp;/g, '&').split('?')[0];
      if (cleanUrl.startsWith('//')) cleanUrl = 'https:' + cleanUrl;
      const checkRes = await fetch(cleanUrl, { method: 'HEAD' });
      if (checkRes.status === 200) return cleanUrl;
    }
  } catch (err) {}
  return null;
}

async function main() {
  console.log('=== Starting Clean Cover Art Curation ===');
  
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { category: 'PS4' },
        { category: 'PS5' }
      ]
    }
  });

  console.log(`Found ${products.length} products to evaluate.`);
  
  const coverCache = {};
  let updateCount = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const cleanName = getCleanBaseTitle(p.name);
    
    console.log(`\n[${i + 1}/${products.length}] Processing: "${p.name}" (Clean: "${cleanName}")`);

    if (coverCache[cleanName]) {
      const cachedUrl = coverCache[cleanName];
      if (p.imageUrl !== cachedUrl) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageUrl: cachedUrl }
        });
        console.log(`  --> UPDATED from cache to clean cover: "${cachedUrl}"`);
        updateCount++;
      } else {
        console.log(`  --> ALREADY matches clean cover: "${cachedUrl}"`);
      }
      continue;
    }

    // Attempt to resolve cover
    let cleanCover = await getSteamCover(cleanName);
    if (cleanCover) {
      console.log(`  --> Steam Cover Resolved: "${cleanCover}"`);
    } else {
      console.log('  --> Steam not found, trying Bing vertical poster...');
      cleanCover = await getBingCover(cleanName);
      if (cleanCover) {
        console.log(`  --> Bing Cover Resolved: "${cleanCover}"`);
      }
    }

    if (cleanCover) {
      coverCache[cleanName] = cleanCover;
      if (p.imageUrl !== cleanCover) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageUrl: cleanCover }
        });
        console.log(`  --> UPDATED to clean cover: "${cleanCover}"`);
        updateCount++;
      } else {
        console.log(`  --> ALREADY matches clean cover`);
      }
    } else {
      console.log(`  --> WARNING: Could not resolve clean cover for "${cleanName}". Keeping current image.`);
    }

    // Add a tiny sleep to be polite to APIs
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n=== Clean Cover Art Curation Completed ===`);
  console.log(`Total Products Updated: ${updateCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
