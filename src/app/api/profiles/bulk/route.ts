import { NextRequest, NextResponse } from 'next/server';
import { BulkAction, BulkInputError, bulkUpdateProfiles, parseBulkIds } from '@/lib/bulkService';

export const dynamic = 'force-dynamic';

// POST /api/profiles/bulk - { ids, action, tags?, collections? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await bulkUpdateProfiles({
      ids: parseBulkIds(body.ids),
      action: body.action as BulkAction,
      tags: body.tags,
      collections: body.collections,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof BulkInputError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error('Bulk update failed:', error);
    return NextResponse.json({ success: false, error: 'The bulk action failed' }, { status: 500 });
  }
}
