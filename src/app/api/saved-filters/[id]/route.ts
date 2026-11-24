import { NextResponse } from 'next/server';
import { deleteSavedFilter } from '@/lib/savedFilters';

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (!(await deleteSavedFilter(params.id))) return NextResponse.json({ success: false, error: 'Saved filter not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/saved-filters/[id] error:', error);
    return NextResponse.json({ success: false, error: 'The filter could not be deleted' }, { status: 500 });
  }
}
