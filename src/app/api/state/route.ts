// Estas dos líneas apagan por completo la caché de Next.js para esta ruta
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    // Leemos los datos directamente de la base de datos en la nube
    const data = await kv.get('interview-state');
    return NextResponse.json(data || { fullTranscript: '', qaFeed: [] });
  } catch (e) {
    console.error('Error leyendo el estado en Vercel KV:', e);
    return NextResponse.json({ fullTranscript: '', qaFeed: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Guardamos los datos en la llave 'interview-state'
    await kv.set('interview-state', body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error al guardar el estado en Vercel KV:', e);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}