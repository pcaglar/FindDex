import { NextRequest, NextResponse } from 'next/server';
import { getProfilesPage, emptyTrash } from '@/lib/profileService';

export const dynamic = 'force-dynamic';

const TRASH_PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    const requestedPage = Number(request.nextUrl.searchParams.get('page') || '1');
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const result = await getProfilesPage({ includeDeleted: true, page, pageSize: TRASH_PAGE_SIZE });
    return NextResponse.json({
      success: true,
      data: result.profiles,
      pagination: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
    });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json({ success: false, error: 'Trash could not be loaded' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const count = await emptyTrash();
    return NextResponse.json({
      success: true,
      message: `${count} profiles were permanently deleted from Trash`,
      count,
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ success: false, error: 'Trash could not be emptied' }, { status: 500 });
  }
}
