import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json(
    { message: 'Esta acción está deshabilitada. Las recargas deben ser gestionadas por el administrador.' },
    { status: 403 }
  );
}
