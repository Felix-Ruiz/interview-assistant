export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const data = await kv.get('interview-state');
    return NextResponse.json(data || { fullTranscript: '', qaFeed: [] });
  } catch (e: any) {
    console.error('Error KV GET:', e.message);
    return NextResponse.json({ error: 'KV_ERROR', details: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await kv.set('interview-state', body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Error KV POST:', e.message);
    return NextResponse.json({ error: 'KV_ERROR', details: e.message }, { status: 500 });
  }
}