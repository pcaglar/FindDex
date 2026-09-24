import { NextRequest, NextResponse } from 'next/server';
import { getAppSettings, updateAppSettings } from '@/lib/appSettings';

export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ success: true, data: await getAppSettings() });
}
export async function PUT(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, data: await updateAppSettings(await request.json()) });
  } catch (error) {
    console.error('Settings update failed:', error);
    return NextResponse.json({ success: false, error: 'Settings could not be saved' }, { status: 500 });
  }
}
