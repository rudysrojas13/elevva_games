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
    const { status, credentials } = body;

    if (status && !['Pendiente', 'Completado', 'Cancelado'].includes(status)) {
      return NextResponse.json({ message: 'Estado inválido' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    const oldStatus = existingOrder.status;
    const targetStatus = status || oldStatus;
    const targetCredentials = credentials !== undefined ? credentials : existingOrder.credentials;

    // Run database operations in transaction to update status, handle stock and refund balance
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. If order is cancelled now (and wasn't previously Cancelled), restore product stock and user balance
      if (targetStatus === 'Cancelado' && oldStatus !== 'Cancelado') {
        // Restore stock
        await tx.product.update({
          where: { id: existingOrder.productId },
          data: {
            stock: {
              increment: 1,
            },
          },
        });

        // Refund balance to user
        await tx.user.update({
          where: { id: existingOrder.userId },
          data: {
            balance: {
              increment: existingOrder.total,
            },
          },
        });
      } 
      // 2. If order is being re-activated from Cancelled, reduce stock and deduct balance again
      else if (targetStatus !== 'Cancelado' && oldStatus === 'Cancelado') {
        const prod = await tx.product.findUnique({
          where: { id: existingOrder.productId },
        });

        if (!prod || prod.stock < 1) {
          throw new Error(`Stock insuficiente para reactivar el pedido.`);
        }

        const orderUser = await tx.user.findUnique({
          where: { id: existingOrder.userId },
        });

        if (!orderUser || orderUser.balance < existingOrder.total) {
          throw new Error(`Saldo del usuario insuficiente para reactivar el pedido.`);
        }

        // Deduct stock
        await tx.product.update({
          where: { id: existingOrder.productId },
          data: {
            stock: {
              decrement: 1,
            },
          },
        });

        // Deduct balance from user
        await tx.user.update({
          where: { id: existingOrder.userId },
          data: {
            balance: {
              decrement: existingOrder.total,
            },
          },
        });
      }

      // Update the order details
      return await tx.order.update({
        where: { id },
        data: { 
          status: targetStatus,
          credentials: targetCredentials
        },
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
      });
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json({ message: error.message || 'Error al actualizar pedido' }, { status: 500 });
  }
}
