import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, sellerId, apiKey, productId, token } = body;

    if (!action) {
      return NextResponse.json({ message: 'Acción requerida' }, { status: 400 });
    }

    // ACTION 1: LOGIN (OBTAIN TOKEN)
    if (action === 'login') {
      if (!sellerId || !apiKey) {
        return NextResponse.json({ message: 'Seller ID y API Key son requeridos' }, { status: 400 });
      }

      const timestamp = Math.floor(Date.now() / 1000);
      
      // Calculate SHA256(API_KEY + timestamp)
      const sign = crypto
        .createHash('sha256')
        .update(apiKey + timestamp)
        .digest('hex');

      console.log('Realizando login en Digiseller...');
      console.log('Seller ID:', sellerId);
      console.log('Timestamp:', timestamp);
      console.log('Sign:', sign);

      const response = await fetch('https://api.digiseller.com/api/apilogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          seller_id: parseInt(sellerId),
          timestamp: timestamp,
          sign: sign,
        }),
      });

      const data = await response.json();
      return NextResponse.json(data);
    }

    // ACTION 2: GET PRODUCT DATA
    if (action === 'product') {
      if (!productId || !token) {
        return NextResponse.json({ message: 'Product ID y Token son requeridos' }, { status: 400 });
      }

      console.log(`Obteniendo datos del producto ${productId} de Digiseller...`);

      const response = await fetch(`https://api.digiseller.com/api/products/${productId}/data?token=${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      return NextResponse.json(data);
    }

    // ACTION 3: SEARCH PRODUCTS
    if (action === 'search') {
      const { productName, priceMin, priceMax, sortBy } = body;
      console.log(`Buscando productos para "${productName}" en Digiseller...`);

      let url = `https://api.digiseller.com/api/cataloguer/front/products?productName=${encodeURIComponent(productName || '')}&ownerId=plati&currency=USD&lang=en-US&count=100&page=1&getProductsRecursive=true&sortBy=${sortBy || 'popular'}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const data = await response.json();
      return NextResponse.json(data);
    }

    // ACTION 4: GET SELLER PRODUCTS
    if (action === 'seller') {
      const { sellerId: targetSellerId } = body;
      if (!targetSellerId) {
        return NextResponse.json({ message: 'Seller ID es requerido' }, { status: 400 });
      }
      console.log(`Buscando catálogo del vendedor ${targetSellerId} en Digiseller...`);
      const response = await fetch(`https://api.digiseller.com/api/shop/products?seller_id=${targetSellerId}&rows=1000&currency=USD&lang=en-US`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ message: 'Acción no soportada' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en proxy de Digiseller:', error);
    return NextResponse.json(
      { message: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
