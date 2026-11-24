import { NextResponse } from 'next/server';
import { getStats } from '@/lib/profileService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in /api/stats:', error);
    return NextResponse.json({ success: false, error: 'Statistics could not be loaded' }, { status: 500 });
  }
}
