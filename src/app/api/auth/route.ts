import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Correo y contraseña requeridos' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuario no encontrado o credenciales incorrectas' },
        { status: 401 }
      );
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);

    if (!isMatch) {
      return NextResponse.json(
        { message: 'Usuario no encontrado o credenciales incorrectas' },
        { status: 401 }
      );
    }

    // Set cookie with user ID
    const cookieStore = await cookies();
    cookieStore.set('user_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    // Return user info (omitting password hash)
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Error en autenticación:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('user_session');

    if (session && session.value) {
      const user = await prisma.user.findUnique({
        where: { id: session.value },
      });

      if (user) {
        const { passwordHash: _, ...safeUser } = user;
        return NextResponse.json({ authenticated: true, user: safeUser });
      }
    }

    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Error verificando sesión:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('user_session');
  return NextResponse.json({ success: true });
}
