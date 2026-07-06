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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { clientName, clientPrice, clientNotes } = body;

    // Verify order exists and belongs to this user
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ message: 'Pedido no encontrado' }, { status: 404 });
    }

    // Only the order owner or admin can edit reseller metadata
    if (order.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 403 });
    }

    // Update reseller metadata
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        clientName: clientName !== undefined ? clientName : order.clientName,
        clientPrice: clientPrice !== undefined ? parseFloat(clientPrice) || 0.0 : order.clientPrice,
        clientNotes: clientNotes !== undefined ? clientNotes : order.clientNotes,
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Error al actualizar metadatos del revendedor:', error);
    return NextResponse.json(
      { message: 'Error al actualizar metadatos del revendedor' },
      { status: 500 }
    );
  }
}
