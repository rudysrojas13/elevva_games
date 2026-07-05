const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const fs = require('fs');

function cleanTitleForImage(name) {
  let title = name;
  title = title.replace(/\(([^)]+)\)/g, '');
  title = title.split(' (PS')[0].split(' | Alquiler')[0].split(' | P2')[0];
  title = title.replace(/[💳⭐🔥⚡🔰🟢]/g, '');
  
  title = title.replace(/(Gold|Deluxe|Standard|Ultimate|Complete|Definitive|Legacy|GOTY|Game of the Year|Special|Legendary|Enhanced|Remastered|Remake|Eternal)\s+Edition/gi, '');
  title = title.replace(/\b(Gold|Deluxe|Ultimate|Complete|Definitive|Remastered|Remake|Eternal|Collection)\b/gi, '');
  
  title = title.replace(/Alquiler\s+\d+\s+días/gi, '');
  title = title.replace(/Alquiler/gi, '');
  title = title.replace(/Rent\s+\d+\s+days/gi, '');
  title = title.replace(/Rent/gi, '');
  
  if (!/fifa|pes|nba/i.test(title)) {
    title = title.replace(/\b20\d{2}\b/g, '');
  }
  title = title.replace(/-+/g, ' ');
  return title.trim().replace(/\s+/g, ' ');
}

// Translate logic
async function translateEnToEs(text) {
  if (!text) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map((s) => s[0]).join('');
  } catch (e) {
    return text;
  }
}

// Cover Finder logic
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

function cleanProductName(name, consoleType) {
  let cleanName = name;
  cleanName = cleanName.replace(/\(([^)]+)\)/g, '');
  cleanName = cleanName.replace(/^[^\w\s]+/gi, '');
  cleanName = cleanName.replace(/Rent\s+\d+\s+days/gi, '');
  cleanName = cleanName.replace(/Rent/gi, '');
  cleanName = cleanName.trim().replace(/\s+/g, ' ');
  
  const lowerName = cleanName.toLowerCase();
  const isAccount = lowerName.includes('p1') || 
                    lowerName.includes('p2') || 
                    lowerName.includes('p3') || 
                    lowerName.includes('activacion') || 
                    lowerName.includes('activation') || 
                    lowerName.includes('offline') || 
                    lowerName.includes('sin conexion') || 
                    lowerName.includes('sin conexión');
                    
  if (isAccount) {
    return `${cleanName} (${consoleType}) | Cuenta Completa`;
  } else {
    return `${cleanName} (${consoleType}) | Alquiler`;
  }
}

// Custom DNS lookup to query Digiseller .ru
const dns = require('dns');
const https = require('https');
dns.setServers(['8.8.8.8', '1.1.1.1']);

function customLookup(hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'object' ? options : {};
  dns.resolve4(hostname, (err, addresses) => {
    if (err) {
      cb(err);
      return;
    }
    if (opts.all) {
      cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
    } else {
      cb(null, addresses[0], 4);
    }
  });
}

function fetchDetails(productId, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.digiseller.ru',
      port: 443,
      path: `/api/products/${productId}/data?token=${token}&lang=en-US`,
      method: 'GET',
      lookup: customLookup,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const authSellerId = '1461942';
  const apiKey = '75AD41D93D08419B833A490684DE4655';
  const exchangeRate = 3700;
  const markupPercent = 35;
  const stock = 10;
  
  // Load list to import
  const listPath = 'C:\\Users\\pc\\Downloads\\cheapest_import_list.json';
  if (!fs.existsSync(listPath)) {
    throw new Error('Cheapest import list file not found!');
  }
  const listToImport = JSON.parse(fs.readFileSync(listPath, 'utf8'));
  console.log(`Loaded ${listToImport.length} items to import.`);

  // 1. Authenticate to Digiseller
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('sha256').update(apiKey + timestamp).digest('hex');
  
  console.log('Authenticating to Digiseller...');
  const loginRes = await fetch('https://api.digiseller.ru/api/apilogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ seller_id: parseInt(authSellerId), timestamp, sign }),
  });
  const loginData = await loginRes.json();
  if (loginData.retval !== 0) {
    throw new Error(`Auth failed: ${loginData.retdesc}`);
  }
  const token = loginData.token;
  console.log('Auth successful. Token acquired.');

  let importedCount = 0;

  for (let i = 0; i < listToImport.length; i++) {
    const item = listToImport[i];
    const rawProd = item.product;
    const productId = rawProd.id;
    const category = item.category;
    const targetId = `${productId}-${category}`;

    console.log(`\n[${i + 1}/${listToImport.length}] Importing: "${rawProd.name}" (${category})`);

    try {
      // Fetch details from Digiseller
      const detailData = await fetchDetails(productId, token);
      if (detailData.retval !== 0 || !detailData.product) {
        console.error(`  --> Error loading details: ${detailData.retdesc || 'empty'}`);
        continue;
      }

      const p = detailData.product;
      const usdPrice = parseFloat(p.price) || 0;
      const copPrice = Math.ceil((usdPrice * exchangeRate * (1 + markupPercent / 100)) / 1000);

      // Translate description
      let desc = p.info || p.add_info || '';
      desc = await translateEnToEs(desc);

      // Process options/rates
      let optionsJson = '[]';
      let rawVariants = [];
      if (p.rates && p.rates.length > 0) {
        rawVariants = p.rates;
      } else if (p.options && p.options.length > 0) {
        const opt = p.options.find(o => o.variants && o.variants.length > 0);
        if (opt) rawVariants = opt.variants;
      }

      if (rawVariants.length > 0) {
        const parsedOpts = await Promise.all(
          rawVariants
            .filter(v => v.text || v.label || v.name || v.count_days)
            .map(async (v) => {
              let label = v.text || v.label || v.name || `${v.count_days || ''} días`;
              label = await translateEnToEs(label);
              
              let variantPrice = usdPrice;
              const modVal = parseFloat(v.modify_value) || 0;
              const modType = v.modify_type ? v.modify_type.trim().toUpperCase() : '';

              if (modVal !== 0) {
                if (modType === '%') {
                  variantPrice = usdPrice + (usdPrice * (modVal / 100));
                } else if (modType === 'USD' || modType === '$' || modType === 'SUM') {
                  variantPrice = usdPrice + modVal;
                } else if (p.prices && p.prices.initial && p.prices.initial[modType] && p.prices.initial.USD) {
                  variantPrice = usdPrice + (modVal * (p.prices.initial.USD / p.prices.initial[modType]));
                } else {
                  variantPrice = usdPrice + modVal;
                }
              } else if (v.price) {
                variantPrice = parseFloat(v.price);
              }

              return {
                label,
                price: Math.ceil((variantPrice * exchangeRate * (1 + markupPercent / 100)) / 1000),
                costUsd: variantPrice,
              };
            })
        );
        optionsJson = JSON.stringify(parsedOpts);
      }

      // Clean translated name
      const nameTranslated = await translateEnToEs(p.name || 'Juego');
      const finalName = cleanProductName(nameTranslated, category);

      // Get Clean Cover Artwork (Steam + Bing fallback)
      const cleanImgName = cleanTitleForImage(p.name);
      console.log(`  --> Resolving cover for "${cleanImgName}"...`);
      let cleanCover = await getSteamCover(cleanImgName);
      if (!cleanCover) {
        console.log(`  --> Steam not found, trying Bing Images...`);
        cleanCover = await getBingCover(cleanImgName, category);
      }
      
      const imgUrl = cleanCover || (p.preview_imgs && p.preview_imgs[0] ? p.preview_imgs[0].url : 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600');
      console.log(`  --> Selected cover URL: ${imgUrl}`);

      // Upsert record
      await prisma.product.upsert({
        where: { id: targetId },
        update: {
          name: finalName,
          description: desc,
          price: copPrice,
          options: optionsJson,
          category: category,
          imageUrl: imgUrl,
          stock,
          active: true,
          costUsd: usdPrice,
          trm: exchangeRate,
          markupPercent,
        },
        create: {
          id: targetId,
          name: finalName,
          description: desc,
          price: copPrice,
          options: optionsJson,
          category: category,
          imageUrl: imgUrl,
          stock,
          active: true,
          costUsd: usdPrice,
          trm: exchangeRate,
          markupPercent,
        }
      });
      console.log(`  --> SUCCESS! Imported: "${finalName}"`);
      importedCount++;

    } catch (err) {
      console.error(`  --> Request failed for ${productId}:`, err.message);
    }

    // Sleep to avoid API throttling
    await sleep(250);
  }

  console.log(`\n=== Import Completed ===`);
  console.log(`Successfully Imported Products: ${importedCount}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
