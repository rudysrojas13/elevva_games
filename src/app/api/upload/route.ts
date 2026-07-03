import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF.' }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'El archivo es muy grande. Máximo 10MB.' }, { status: 400 });
    }

    // Step 1: Remove background via remove.bg API
    const removeBgKey = process.env.REMOVEBG_API_KEY;
    let finalFile: File | Blob = file;
    let finalFilename = `covers/${Date.now()}-${file.name.replace(/\s+/g, '-').replace(/\.[^.]+$/, '')}.png`;

    if (removeBgKey) {
      try {
        const rbFormData = new FormData();
        rbFormData.append('image_file', file);
        rbFormData.append('size', 'auto');

        const rbRes = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': removeBgKey },
          body: rbFormData,
        });

        if (rbRes.ok) {
          // remove.bg returns a transparent PNG binary
          const transparentPng = await rbRes.arrayBuffer();
          finalFile = new Blob([transparentPng], { type: 'image/png' });
        } else {
          const errText = await rbRes.text();
          console.error('remove.bg error:', rbRes.status, errText);
          // Fall through and upload original if remove.bg fails
        }
      } catch (rbErr) {
        console.error('remove.bg fetch failed, uploading original:', rbErr);
      }
    }

    // Step 2: Upload to Vercel Blob CDN
    const blob = await put(finalFilename, finalFile, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Error al subir la imagen.' }, { status: 500 });
  }
}

