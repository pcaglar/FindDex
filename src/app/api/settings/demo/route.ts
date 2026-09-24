import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { clearVaultData } from '@/lib/vaultMaintenance';
import { seedDemoData } from '../../../../../prisma/seed';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.confirmation !== 'DEMO') return NextResponse.json({ success: false, error: 'The confirmation text is invalid' }, { status: 400 });
    await clearVaultData();
    const result = await seedDemoData(prisma);
    return NextResponse.json({ success: true, data: result, message: `Demo content loaded: ${result.profiles} profiles, ${result.tags} tags, ${result.collections} collections` });
  } catch (error) {
    console.error('Demo seed failed:', error);
    return NextResponse.json({ success: false, error: 'Demo content could not be loaded' }, { status: 500 });
  }
}
