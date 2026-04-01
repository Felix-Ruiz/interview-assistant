import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Creamos un archivo temporal en la raíz de tu proyecto para sincronizar los dispositivos
const dataFilePath = path.join(process.cwd(), 'sync-state.json');

export async function GET() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (e) {
    // Si el archivo no existe aún, enviamos un estado limpio
    return NextResponse.json({ fullTranscript: '', qaFeed: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await fs.writeFile(dataFilePath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error al guardar el estado:', e);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}