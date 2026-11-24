import { NextRequest, NextResponse } from 'next/server';
import { listSavedFilters, saveFilter, SavedFilterInputError } from '@/lib/savedFilters';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: await listSavedFilters() });
  } catch (error) {
    console.error('GET /api/saved-filters error:', error);
    return NextResponse.json({ success: false, error: 'Saved filters could not be loaded' }, { status: 500 });
  }
}

// POST /api/saved-filters - { name, filters }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await saveFilter(body.name, body.filters) }, { status: 201 });
  } catch (error) {
    if (error instanceof SavedFilterInputError) return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    console.error('POST /api/saved-filters error:', error);
    return NextResponse.json({ success: false, error: 'The filter could not be saved' }, { status: 500 });
  }
}
