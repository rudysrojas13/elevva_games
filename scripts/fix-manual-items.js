const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSteamCover(cleanName) {
  try {
    // Strip colons/dashes for Steam search too
    const baseName = cleanName.replace(/[:\-]/g, ' ').trim();
    const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(baseName)}&l=english&cc=US`;
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

async function queryBing(query) {
  try {
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

async function getBingCover(cleanName) {
  const baseName = cleanName.replace(/[:\-]/g, ' ').trim();
  let cover = await queryBing(`${baseName} steam grid`);
  if (!cover) {
    console.log(`  --> Bing steam grid returned null, trying Bing portrait cover...`);
    cover = await queryBing(`${baseName} portrait cover`);
  }
  return cover;
}

async function main() {
  console.log('=== Starting Manual Game Title and Cover Curation (V2) ===');

  const products = await prisma.product.findMany({
    where: { active: true }
  });

  let updateCount = 0;

  for (const p of products) {
    let newName = p.name;
    let needsUpdate = false;
    let searchNameForCover = null;

    // 1. Rename "Hasta el amanecer" to "Until Dawn"
    if (p.name.includes('Hasta el amanecer')) {
      newName = p.name.replace('Hasta el amanecer', 'Until Dawn');
      if (newName.endsWith('| Al')) {
        newName = newName.replace('| Al', '| Alquiler');
      }
      needsUpdate = true;
      searchNameForCover = 'Until Dawn';
    }

    // 2. Rename "Una salida" to "A Way Out" and fix "Cuenta Completa18"
    if (p.name.includes('Una salida')) {
      newName = p.name.replace('Una salida', 'A Way Out');
      needsUpdate = true;
      searchNameForCover = 'A Way Out';
    }
    if (newName.includes('Cuenta Completa18')) {
      newName = newName.replace('Cuenta Completa18', 'Cuenta Completa');
      needsUpdate = true;
    }

    // 3. Rename "Se necesitan dos + una salida" to "It Takes Two + A Way Out"
    if (p.name.includes('Se necesitan dos + una salida')) {
      newName = p.name.replace('Se necesitan dos + una salida', 'It Takes Two + A Way Out');
      needsUpdate = true;
      searchNameForCover = 'It Takes Two';
    }

    // 4. Rename "Jurassic World Evolution 3" to "Jurassic World Evolution 2"
    if (p.name.includes('Jurassic World Evolution 3')) {
      newName = p.name.replace('Jurassic World Evolution 3', 'Jurassic World Evolution 2');
      needsUpdate = true;
      searchNameForCover = 'Jurassic World Evolution 2';
    }

    // 5. Correct "PES 2018" name spelling
    if (p.name.includes('Pes 2018')) {
      newName = p.name.replace('Pes 2018', 'PES 2018');
      if (newName.endsWith('| Alquile')) {
        newName = newName.replace('| Alquile', '| Alquiler');
      }
      needsUpdate = true;
      searchNameForCover = 'PES 2018';
    }

    // 6. Clean double spaces and standardize FIFA 23 Ultimate
    if (p.name.includes('FIFA 23 Ultimate  (PS5)')) {
      newName = p.name.replace('FIFA 23 Ultimate  (PS5) | Alquiler', 'FIFA 23 Ultimate Alquiler 7 días (PS5) | Alquiler');
      needsUpdate = true;
      searchNameForCover = 'FIFA 23';
    }

    // 7. Standardize target name for cover search of specific items requested by the user
    if (p.name.includes('FIFA 22 Ultimate')) {
      searchNameForCover = 'FIFA 22';
    }
    if (p.name.includes('FIFA 23 Alquiler 7 días') || p.name.includes('FIFA 23 Ultimate Alquiler')) {
      searchNameForCover = 'FIFA 23';
    }
    if (p.name.includes('FOR HONOR DELUXE')) {
      searchNameForCover = 'For Honor';
    }
    if (p.name.includes('God of War 3')) {
      searchNameForCover = 'God of War III';
    }
    if (p.name.includes('Hogwarts Legacy')) {
      searchNameForCover = 'Hogwarts Legacy';
    }
    if (p.name.includes('Indiana Jones y el Gran Círculo')) {
      searchNameForCover = 'Indiana Jones and the Great Circle';
    }
    if (p.name.includes('Paquete Metro Saga')) {
      searchNameForCover = 'Metro Saga Bundle';
    }
    if (p.name.includes('RESIDENT EVIL 3 Remake')) {
      searchNameForCover = 'Resident Evil 3';
    }
    if (p.name.includes('RESIDENT EVIL 7 Gold')) {
      searchNameForCover = 'Resident Evil 7 Biohazard';
    }
    if (p.name.includes('RESIDENT EVIL 4 Remake')) {
      searchNameForCover = 'Resident Evil 4';
    }
    if (p.name.includes('The Evil Within 2')) {
      searchNameForCover = 'The Evil Within 2';
    }
    if (p.name.includes('The Witcher 3 Complete')) {
      searchNameForCover = 'The Witcher 3';
    }
    if (p.name.includes('UFC 2')) {
      searchNameForCover = 'EA Sports UFC 2';
    }
    if (p.name.includes('Diablo II: Resurrected')) {
      searchNameForCover = 'Diablo II: Resurrected';
    }
    if (p.name.includes('Call of Duty Modern Warfare')) {
      searchNameForCover = 'Call of Duty: Modern Warfare';
    }
    if (p.name.includes('Edición dorada del Crew Motorfest')) {
      searchNameForCover = 'The Crew Motorfest';
    }

    // Determine if we need to update cover
    let cleanCoverUrl = null;
    if (searchNameForCover) {
      console.log(`\nResolving clean cover for: "${newName}" (Search query: "${searchNameForCover}")`);
      cleanCoverUrl = await getSteamCover(searchNameForCover);
      if (cleanCoverUrl) {
        console.log(`  --> Steam Cover: "${cleanCoverUrl}"`);
      } else {
        cleanCoverUrl = await getBingCover(searchNameForCover);
        if (cleanCoverUrl) {
          console.log(`  --> Bing Cover: "${cleanCoverUrl}"`);
        }
      }
    }

    // Apply updates if any change is detected
    if (needsUpdate || (cleanCoverUrl && p.imageUrl !== cleanCoverUrl)) {
      const updateData = {};
      if (needsUpdate) {
        updateData.name = newName;
      }
      if (cleanCoverUrl && p.imageUrl !== cleanCoverUrl) {
        updateData.imageUrl = cleanCoverUrl;
      }

      await prisma.product.update({
        where: { id: p.id },
        data: updateData
      });

      console.log(`[UPDATED] ID: ${p.id}`);
      if (needsUpdate) console.log(`  Old Name: "${p.name}" -> New Name: "${newName}"`);
      if (cleanCoverUrl && p.imageUrl !== cleanCoverUrl) console.log(`  Old Image: "${p.imageUrl}" -> New Image: "${cleanCoverUrl}"`);
      updateCount++;
    }
  }

  console.log(`\n=== Manual Game Title and Cover Curation Completed ===`);
  console.log(`Total Products Updated: ${updateCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
