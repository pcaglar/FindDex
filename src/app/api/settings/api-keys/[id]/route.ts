import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try { await prisma.apiKey.delete({ where: { id: params.id } }); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ success: false, error: 'The API key could not be revoked' }, { status: 404 }); }
}
