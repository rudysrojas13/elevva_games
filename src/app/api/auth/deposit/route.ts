import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('user_session');

    if (!session || !session.value) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ message: 'Monto inválido' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.value },
      data: {
        balance: {
          increment: parseFloat(amount),
        },
      },
    });

    const { passwordHash: _, ...safeUser } = updatedUser;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Error al simular depósito:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
