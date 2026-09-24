import { NextRequest, NextResponse } from 'next/server';
import { clearVaultData } from '@/lib/vaultMaintenance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!['SIFIRLA', 'RESET'].includes(body.confirmation)) return NextResponse.json({ success: false, error: 'Invalid confirmation text' }, { status: 400 });
    const result = await clearVaultData();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Full reset failed:', error);
    return NextResponse.json({ success: false, error: 'All data could not be reset' }, { status: 500 });
  }
}
