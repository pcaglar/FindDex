import { NextResponse } from 'next/server';
import { cleanOldTrash } from '@/lib/profileService';

export const dynamic = 'force-dynamic';

// POST /api/maintenance/trash - permanently delete trash older than the configured retention.
// Deliberately a POST: it deletes data, so it must never run from a plain GET/prefetch.
export async function POST() {
  try {
    return NextResponse.json({ success: true, data: { deleted: await cleanOldTrash() } });
  } catch (error) {
    console.error('Trash cleanup failed:', error);
    return NextResponse.json({ success: false, error: 'Trash could not be cleaned' }, { status: 500 });
  }
}
