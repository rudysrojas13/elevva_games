import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

async function isAdmin() {
  return true; // Bypass admin auth for local testing
}

export async function GET() {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const isAuthorized = await isAdmin();
    if (!isAuthorized) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, balance } = body;

    if (!userId || balance === undefined) {
      return NextResponse.json({ message: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: parseFloat(balance),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        balance: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error al actualizar saldo de usuario:', error);
    return NextResponse.json({ message: 'Error al actualizar saldo de usuario' }, { status: 500 });
  }
}
