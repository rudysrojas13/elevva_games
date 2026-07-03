import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

async function isAdmin() {
  return true; // Bypass admin auth for local testing
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, price, costUsd, trm, markupPercent, options, category, imageUrl, stock, active } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    const cUsd = costUsd !== undefined ? parseFloat(costUsd) : existingProduct.costUsd;
    const rateTrm = trm !== undefined ? parseFloat(trm) : existingProduct.trm;
    let markupVal = markupPercent !== undefined ? parseFloat(markupPercent) : existingProduct.markupPercent;

    let finalPrice = existingProduct.price;
    if (price !== undefined) {
      finalPrice = parseFloat(price) / 1000;
      if (cUsd > 0 && rateTrm > 0) {
        markupVal = Math.round((((finalPrice * 1000) / (cUsd * rateTrm)) - 1) * 100);
      }
    } else if (costUsd !== undefined || trm !== undefined || markupPercent !== undefined) {
      finalPrice = Math.ceil((cUsd * rateTrm * (1 + markupVal / 100)) / 1000);
    }

    // Also update options prices if cost/trm/markup changed and options exist
    let optionsJson = options !== undefined ? options : existingProduct.options;
    if (options === undefined && existingProduct.options && (costUsd !== undefined || trm !== undefined || markupPercent !== undefined)) {
      try {
        const opts = JSON.parse(existingProduct.options);
        if (Array.isArray(opts) && opts.length > 0) {
          const oldPrice = existingProduct.price;
          const factor = oldPrice > 0 ? finalPrice / oldPrice : 1;
          const updatedOpts = opts.map((opt: any) => {
            const vCostUsd = opt.costUsd !== undefined ? opt.costUsd : ((opt.price / (1 + (existingProduct.markupPercent || 0) / 100)) * 1000) / (existingProduct.trm || 3700);
            const vPrice = opt.costUsd !== undefined
              ? Math.ceil((opt.costUsd * rateTrm * (1 + markupVal / 100)) / 1000)
              : Math.ceil(opt.price * factor);
            return {
              label: opt.label,
              price: vPrice,
              costUsd: vCostUsd
            };
          });
          optionsJson = JSON.stringify(updatedOpts);
        }
      } catch(e) {}
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingProduct.name,
        description: description !== undefined ? description : existingProduct.description,
        price: finalPrice,
        options: optionsJson,
        category: category !== undefined ? category : existingProduct.category,
        imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
        stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
        active: active !== undefined ? active : existingProduct.active,
        costUsd: cUsd,
        trm: rateTrm,
        markupPercent: markupVal,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ message: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Check if the product has orders (to avoid Prisma constraint errors)
    const ordersCount = await prisma.order.count({
      where: { productId: id },
    });

    if (ordersCount > 0) {
      // Soft delete: set active to false instead of deleting from DB to preserve order history
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({ message: 'Producto desactivado por tener historial de ventas', product: updatedProduct });
    }

    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Producto eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ message: 'Error al eliminar producto' }, { status: 500 });
  }
}
