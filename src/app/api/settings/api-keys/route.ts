import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateApiKey } from '@/lib/externalApi';

export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ success: true, data: await prisma.apiKey.findMany({ orderBy: { createdAt: 'desc' } }) });
}
export async function POST(request: NextRequest) {
  try {
    const label = String((await request.json()).label || '').trim();
    if (!label) return NextResponse.json({ success: false, error: 'A key name is required' }, { status: 400 });
    const created = await prisma.apiKey.create({ data: { label: label.slice(0, 80), key: generateApiKey() } });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch { return NextResponse.json({ success: false, error: 'The API key could not be created' }, { status: 500 }); }
}
