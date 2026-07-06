import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function isAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session || !session.value) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.value },
  });
  return user?.role === 'admin';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const all = searchParams.get('all') === 'true'; // Admin requests all products

    const isAuthorized = await isAdmin();

    // Construct filter query
    const where: any = {};
    
    // Non-admin can only see active products
    if (!all || !isAuthorized) {
      where.active = true;
    }

    if (category && category !== 'Todos') {
      where.category = category;
    }

    if (search) {
      where.name = {
        contains: search,
      };
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        options: true,
        category: true,
        imageUrl: true,
        stock: true,
        active: true,
        costUsd: true,
        trm: true,
        markupPercent: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();

    // ACTION: IMPORT FROM DIGISELLER
    if (body.action === 'import') {
      const { productId, category, exchangeRate, markupPercent, stock, active } = body;
      if (!productId) {
        return NextResponse.json({ message: 'Product ID es requerido para importar' }, { status: 400 });
      }

      console.log(`Importando producto ${productId} de Digiseller...`);

      // 1. Authenticate to get a token
      const sellerId = '1461942';
      const apiKey = '75AD41D93D08419B833A490684DE4655';
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = require('crypto');
      const sign = crypto.createHash('sha256').update(apiKey + timestamp).digest('hex');

      const loginRes = await fetch('https://api.digiseller.com/api/apilogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ seller_id: parseInt(sellerId), timestamp, sign }),
      });

      const loginData = await loginRes.json();
      if (loginData.retval !== 0) {
        return NextResponse.json({ message: `Error de login en Digiseller: ${loginData.retdesc}` }, { status: 500 });
      }
      const token = loginData.token;

      // 2. Fetch product data (Request English language)
      const prodRes = await fetch(`https://api.digiseller.com/api/products/${productId}/data?token=${token}&lang=en-US`, {
        headers: { 'Accept': 'application/json' }
      });

      const prodData = await prodRes.json();
      if (prodData.retval !== 0 || !prodData.product) {
        return NextResponse.json({ message: `Error al obtener producto de Digiseller: ${prodData.retdesc || 'No encontrado'}` }, { status: 404 });
      }

      const p = prodData.product;
      const rate = parseFloat(exchangeRate) || 4000;
      const markup = parseFloat(markupPercent) || 0;

      // Calculate price in COP (price in USD * exchangeRate * (1 + markup/100))
      // Scale by /1000 to match DB convention (e.g. 12000 COP -> 12)
      const usdPrice = parseFloat(p.price) || 0;
      const copPrice = Math.ceil((usdPrice * rate * (1 + markup / 100)) / 1000);

      // Extract description
      let desc = p.info || p.add_info || '';
      
      // Helper to translate EN to ES
      const translateEnToEs = async (text: string) => {
        if (!text) return text;
        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
          const res = await fetch(url);
          const data = await res.json();
          return data[0].map((s: any) => s[0]).join('');
        } catch (e) {
          console.error("Translation error:", e);
          return text;
        }
      };

      desc = await translateEnToEs(desc);
      
      // Image URL
      const imgUrl = p.preview_imgs && p.preview_imgs[0] ? p.preview_imgs[0].url : 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3';

      // Extract price options/variants (rental days, editions, etc.)
      const calculateModifierUsd = (modVal: number, modType: string) => {
        if (modVal === 0) return 0;
        if (modType === '%') return usdPrice * (modVal / 100);
        if (modType === 'USD' || modType === '$' || modType === 'SUM') return modVal;
        if (p.prices && p.prices.initial && p.prices.initial[modType] && p.prices.initial.USD) {
          return modVal * (p.prices.initial.USD / p.prices.initial[modType]);
        }
        return modVal;
      };

      let baseTranslatedName = await translateEnToEs(p.name || 'Juego Importado');
      baseTranslatedName = baseTranslatedName.replace(/\/?PS4\/?/ig, '').replace(/\/?PS5\/?/ig, '').replace(/\(\s*\)/g, '').replace(/\|\s*$/g, '').trim();

      // Detect console option and version option
      let consoleOption: any = null;
      let versionOption: any = null;
      
      if (p.options && p.options.length > 0) {
        for (const opt of p.options) {
          if (!opt.variants || opt.variants.length === 0) continue;
          const optLabel = (opt.label || opt.name || '').toLowerCase();
          
          const hasConsoleVariants = opt.variants.some((v: any) => {
            const vText = (v.text || '').toLowerCase();
            return vText.includes('ps4') || vText.includes('playstation 4') || vText.includes('ps5') || vText.includes('playstation 5');
          });

          if (hasConsoleVariants || optLabel.includes('console') || optLabel.includes('consola')) {
            consoleOption = opt;
          } else if (optLabel.includes('version') || optLabel.includes('versión') || opt.variants.some((v:any) => v.text && (v.text.includes('P2') || v.text.includes('P3')))) {
            versionOption = opt;
          } else if (!versionOption && !optLabel.includes('terms') && !optLabel.includes('rules')) {
            versionOption = opt;
          }
        }
      } else if (p.rates && p.rates.length > 0) {
        versionOption = { variants: p.rates };
      }

      // Helper to save a single product combination
      const saveProductCombo = async (
        idSuffix: string, 
        nameSuffix: string, 
        catSuffix: string, 
        cModUsd: number
      ) => {
        let parsedOpts: any[] = [];
        if (versionOption && versionOption.variants) {
          parsedOpts = await Promise.all(
            versionOption.variants
              .filter((v: any) => v.text || v.label || v.name || v.count_days)
              .map(async (v: any) => {
                let label = v.text || v.label || v.name || `${v.count_days || ''} días`;
                label = await translateEnToEs(label);
                
                const vModVal = parseFloat(v.modify_value) || 0;
                const vModType = v.modify_type ? v.modify_type.trim().toUpperCase() : '';
                const vModUsd = calculateModifierUsd(vModVal, vModType);
                
                // Add both console modifier and version modifier
                let variantPrice = usdPrice + cModUsd + vModUsd;
                // Fallback to raw price if no modifiers exist
                if (cModUsd === 0 && vModUsd === 0 && v.price) {
                  variantPrice = parseFloat(v.price) + cModUsd;
                }
                
                return {
                  label,
                  price: Math.ceil((variantPrice * rate * (1 + markup / 100)) / 1000),
                  costUsd: variantPrice,
                };
              })
          );
        }

        const optionsJson = parsedOpts.length > 0 ? JSON.stringify(parsedOpts) : '[]';
        const finalId = idSuffix ? `${productId}-${idSuffix}` : productId.toString();
        const finalName = nameSuffix ? `${baseTranslatedName} (${nameSuffix})` : baseTranslatedName;
        let finalCategory = catSuffix || category || 'Suscripciones';
        if (finalCategory === 'Auto' || !finalCategory || finalCategory === 'Suscripciones') {
          const lowerName = (p.name || '').toLowerCase();
          if (lowerName.includes('ps5') || lowerName.includes('playstation 5')) {
            finalCategory = 'PS5';
          } else if (lowerName.includes('ps4') || lowerName.includes('playstation 4')) {
            finalCategory = 'PS4';
          }
        }

        const existing = await prisma.product.findUnique({ where: { id: finalId } });
        const data = {
          name: finalName,
          description: desc,
          price: copPrice,
          options: optionsJson,
          category: finalCategory,
          imageUrl: imgUrl,
          stock: parseInt(stock) || 10,
          active: active !== undefined ? active : true,
          costUsd: usdPrice,
          trm: rate,
          markupPercent: markup,
        };

        if (existing) {
          return await prisma.product.update({ where: { id: finalId }, data });
        } else {
          return await prisma.product.create({ data: { id: finalId, ...data } });
        }
      };

      let createdProducts = [];

      if (!consoleOption || !consoleOption.variants || consoleOption.variants.length === 0) {
        // No console split, standard single import
        const p1 = await saveProductCombo('', '', '', 0);
        createdProducts.push(p1);
      } else {
        // Split by consoles!
        for (const cVariant of consoleOption.variants) {
          const cLabel = (cVariant.text || cVariant.name || 'Consola').toLowerCase();
          // filter for playstation consoles
          if (!cLabel.includes('ps4') && !cLabel.includes('ps5') && !cLabel.includes('playstation')) continue;
          
          let idSuffix = 'PS4';
          let nameSuffix = 'PS4';
          let catSuffix = 'PS4';
          
          if (cLabel.includes('ps5') || cLabel.includes('playstation 5')) {
            idSuffix = 'PS5';
            nameSuffix = 'PS5';
            catSuffix = 'PS5';
          }
          
          const cModVal = parseFloat(cVariant.modify_value) || 0;
          const cModType = cVariant.modify_type ? cVariant.modify_type.trim().toUpperCase() : '';
          const cModUsd = calculateModifierUsd(cModVal, cModType);

          const pConsole = await saveProductCombo(idSuffix, nameSuffix, catSuffix, cModUsd);
          createdProducts.push(pConsole);
        }
        
        // If for some reason the variants were not playstation, fallback to default
        if (createdProducts.length === 0) {
          const pDefault = await saveProductCombo('', '', '', 0);
          createdProducts.push(pDefault);
        }
      }

      // Return the list of products (or single product) so the frontend knows what was imported
      return NextResponse.json(createdProducts.length === 1 ? createdProducts[0] : createdProducts);
    }

    // DEFAULT ACTION: MANUAL CREATE
    const { name, description, price, costUsd, trm, markupPercent, options, category, imageUrl, stock, active } = body;

    if (!name || price === undefined || !category || !imageUrl) {
      return NextResponse.json({ message: 'Faltan campos requeridos' }, { status: 400 });
    }

    const cUsd = parseFloat(costUsd) || 0;
    const rateTrm = parseFloat(trm) || 4000;
    const markupVal = parseFloat(markupPercent) || 0;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        options: options ? JSON.stringify(options) : '',
        category,
        imageUrl,
        stock: parseInt(stock) || 0,
        active: active !== undefined ? active : true,
        costUsd: cUsd,
        trm: rateTrm,
        markupPercent: markupVal,
      },
    });

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('Error al crear/importar producto:', error);
    return NextResponse.json({ message: 'Error interno en el servidor' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    // Must delete orders first (foreign key constraint)
    await prisma.order.deleteMany({});
    // Then delete all products
    await prisma.product.deleteMany({});

    return NextResponse.json({ success: true, message: 'Catálogo y pedidos asociados eliminados correctamente.' });
  } catch (error: any) {
    console.error('Error al vaciar catálogo:', error);
    return NextResponse.json({ message: 'Error al vaciar el catálogo de productos: ' + error.message }, { status: 500 });
  }
}
