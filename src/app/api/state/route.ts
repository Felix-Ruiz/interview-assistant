export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createClient } from 'redis';

// Función para conectar y desconectar limpiamente en cada petición Serverless
async function getRedisClient() {
  const client = createClient({
    url: process.env.REDIS_URL
  });
  
  client.on('error', (err) => console.error('Error de cliente Redis:', err));
  
  await client.connect();
  return client;
}

export async function GET() {
  try {
    const client = await getRedisClient();
    const dataString = await client.get('interview-state');
    
    // Es vital desconectar para no saturar la base de datos
    await client.disconnect();

    // Redis guarda texto, así que lo convertimos de vuelta a objeto
    const data = dataString ? JSON.parse(dataString) : { fullTranscript: '', qaFeed: [] };
    
    return NextResponse.json(data);
  } catch (e: any) {
    console.error('Error Redis GET:', e.message);
    return NextResponse.json({ error: 'REDIS_ERROR', details: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const client = await getRedisClient();
    
    // Convertimos el objeto a texto antes de guardarlo
    await client.set('interview-state', JSON.stringify(body));
    await client.disconnect();
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error Redis POST:', e.message);
    return NextResponse.json({ error: 'REDIS_ERROR', details: e.message }, { status: 500 });
  }
}