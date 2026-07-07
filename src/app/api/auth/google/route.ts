import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(request: Request) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json(
        { message: 'Credencial de Google no proporcionada' },
        { status: 400 }
      );
    }

    // Verify the Google JWT token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload || !payload.email) {
      return NextResponse.json(
        { message: 'Token de Google inválido o sin correo electrónico' },
        { status: 400 }
      );
    }

    const { email, name, picture } = payload;

    // Find user in DB
    let user = await prisma.user.findUnique({
      where: { email },
    });

    // If user doesn't exist, register them automatically
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || 'Usuario de Google',
          passwordHash: 'GOOGLE_AUTH_MOCK_HASH', // No real password since they use Google
          role: 'user', // By default they are a reseller (user)
          balance: 0.0,
        },
      });
    }

    // Set cookie with user ID exactly like normal login
    const cookieStore = await cookies();
    cookieStore.set('user_session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });

    // Return user info
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error: any) {
    console.error('Error en autenticación con Google:', error);
    return NextResponse.json(
      { message: 'Error interno verificando la cuenta de Google' },
      { status: 500 }
    );
  }
}
