import { NextRequest, NextResponse } from 'next/server';
import { BulkInputError, bulkDeleteTrashedProfiles, bulkRestoreProfiles, parseBulkIds } from '@/lib/bulkService';

export const dynamic = 'force-dynamic';

// POST /api/trash/bulk - { ids, action: 'restore' | 'delete' }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids = parseBulkIds(body.ids);
    if (body.action === 'restore') return NextResponse.json({ success: true, data: await bulkRestoreProfiles(ids) });
    if (body.action === 'delete') return NextResponse.json({ success: true, data: await bulkDeleteTrashedProfiles(ids) });
    throw new BulkInputError('Unknown action');
  } catch (error) {
    if (error instanceof BulkInputError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error('Bulk trash action failed:', error);
    return NextResponse.json({ success: false, error: 'The bulk action failed' }, { status: 500 });
  }
}
