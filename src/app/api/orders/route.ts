import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

async function getUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get('user_session');
  if (!session || !session.value) return null;
  return prisma.user.findUnique({
    where: { id: session.value },
  });
}

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    let orders;
    if (user.role === 'admin') {
      orders = await prisma.order.findMany({
        include: {
          product: true,
          user: {
            select: {
              name: true,
              email: true,
              balance: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { userId: user.id },
        include: {
          product: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json({ message: 'Error al obtener pedidos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ message: 'Producto requerido' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    }

    if (!product.active) {
      return NextResponse.json({ message: 'El producto no está disponible' }, { status: 400 });
    }

    if (product.stock <= 0) {
      return NextResponse.json({ message: 'No hay stock disponible para este juego' }, { status: 400 });
    }

    // Verificar saldo
    if (user.balance < product.price) {
      return NextResponse.json({ message: 'Saldo insuficiente. Carga fondos para continuar.' }, { status: 400 });
    }

    // Transacción: restar saldo del usuario, restar stock del producto y crear pedido
    const order = await prisma.$transaction(async (tx) => {
      // 1. Restar saldo del usuario
      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            decrement: product.price,
          },
        },
      });

      // 2. Restar stock del producto
      await tx.product.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: 1,
          },
        },
      });

      // 3. Crear pedido
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          productId: product.id,
          total: product.price,
          status: 'Pendiente',
          credentials: '',
        },
        include: {
          product: true,
        },
      });

      return newOrder;
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error al crear pedido:', error);
    return NextResponse.json({ message: 'Error interno al procesar el pedido' }, { status: 500 });
  }
}
