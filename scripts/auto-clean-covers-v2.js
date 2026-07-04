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
  
  // Remove edition names to get the base game
  title = title.replace(/(Gold|Deluxe|Standard|Ultimate|Complete|Definitive|Legacy|GOTY|Game of the Year|Special|Legendary|Enhanced|Remastered|Remake|Eternal)\s+Edition/gi, '');
  title = title.replace(/\b(Gold|Deluxe|Ultimate|Complete|Definitive|Remastered|Remake|Eternal|Collection|Del Desenlace del Ladrón|El legado perdido)\b/gi, '');
  
  // Remove words like "Alquiler", "Rent", "7 días"
  title = title.replace(/Alquiler\s+\d+\s+días/gi, '');
  title = title.replace(/Alquiler/gi, '');
  title = title.replace(/Rent\s+\d+\s+days/gi, '');
  title = title.replace(/Rent/gi, '');
  
  // Remove numbers like 2018 or 2021 if it's not FIFA/PES
  if (!/fifa|pes|nba/i.test(title)) {
    title = title.replace(/\b20\d{2}\b/g, '');
  }
  
  // Remove extra dashes
  title = title.replace(/-+/g, ' ');

  return title.trim().replace(/\s+/g, ' ');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      if (checkRes.status === 200) {
        return libraryCoverUrl;
      }
      
      const headerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`;
      const headerCheck = await fetch(headerUrl, { method: 'HEAD' });
      if (headerCheck.status === 200) {
        return headerUrl;
      }
    }
  } catch (err) {
    console.error(`   [Steam Error]:`, err.message);
  }
  return null;
}

async function getBingCover(cleanName, category) {
  try {
    const query = `${cleanName} ${category || 'PS5'} cover`;
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
    
    if (match) {
      imgUrl = match[1];
    } else {
      const regexAlt = /src="([^"]+)"[^>]+class="mimg"/i;
      const matchAlt = html.match(regexAlt);
      if (matchAlt) imgUrl = matchAlt[1];
    }
    
    if (imgUrl) {
      // Decode HTML entities (replace &amp; with &)
      let cleanUrl = imgUrl.replace(/&amp;/g, '&');
      // Strip query parameters to get full-res image
      cleanUrl = cleanUrl.split('?')[0];
      
      // Ensure the URL uses https
      if (cleanUrl.startsWith('//')) {
        cleanUrl = 'https:' + cleanUrl;
      }
      
      // Verify image exists
      const checkRes = await fetch(cleanUrl, { method: 'HEAD' });
      if (checkRes.status === 200) {
        return cleanUrl;
      }
    }
  } catch (err) {
    console.error(`   [Bing Error]:`, err.message);
  }
  return null;
}

async function cleanCovers() {
  console.log('=== Starting Auto Cover Clean-up v2 (Steam + Bing) ===');
  
  const products = await prisma.product.findMany();
  console.log(`Total products in database: ${products.length}`);
  
  // We clean ALL products that still have Digiseller image URLs
  const targets = products.filter(p => 
    p.imageUrl.includes('digiseller') || 
    p.imageUrl.includes('mycdn.ink') || 
    p.imageUrl.includes('digiseller.ru')
  );
  
  console.log(`Products to clean: ${targets.length}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    const cleanName = cleanTitle(p.name);
    console.log(`[${i + 1}/${targets.length}] Processing: "${p.name}" -> Query: "${cleanName}"`);
    
    let coverUrl = null;
    
    // Step 1: Try Steam first (cleanest, uniform covers)
    coverUrl = await getSteamCover(cleanName);
    
    // Step 2: Fallback to Bing Images (perfect for console exclusives, removed FIFA/PES, etc.)
    if (!coverUrl) {
      console.log(`   --> Steam not found. Trying Bing Images...`);
      coverUrl = await getBingCover(cleanName, p.category);
    }
    
    if (coverUrl) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: coverUrl }
      });
      console.log(`   --> SUCCESS! Set cover: ${coverUrl}`);
      successCount++;
    } else {
      console.log(`   --> FAILED to find any clean cover.`);
      failCount++;
    }
    
    // Throttling to avoid rate limit
    await sleep(250);
  }
  
  console.log(`\n=== Cover Clean-up v2 Completed ===`);
  console.log(`Successfully Updated: ${successCount}`);
  console.log(`Not Found / Failed: ${failCount}`);
}

cleanCovers()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
