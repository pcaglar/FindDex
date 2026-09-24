import { NextRequest, NextResponse } from 'next/server';
import { getProfilesPage, createProfile } from '@/lib/profileService';
import { SortOption } from '@/types/profile';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const platformKey = searchParams.get('platform') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const collection = searchParams.get('collection') || undefined;
    const filter = searchParams.get('filter') || undefined;
    const sort = (searchParams.get('sort') || 'newest') as SortOption;
    const requestedPage = Number(searchParams.get('page') || '1');
    const requestedPageSize = Number(searchParams.get('pageSize') || '16');
    const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;
    const allowedPageSizes = [8, 12, 16, 24, 48];
    const pageSize = allowedPageSizes.includes(requestedPageSize) ? requestedPageSize : 16;

    const result = await getProfilesPage({
      search,
      platformKey,
      tag,
      collection,
      filter,
      sort,
      includeDeleted: false,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.profiles,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('API Error in GET /api/profiles:', error);
    return NextResponse.json({ success: false, error: 'Profiles could not be loaded' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.username || !body.displayName) {
      return NextResponse.json(
        { success: false, error: 'Username and name are required' },
        { status: 400 }
      );
    }

    const newProfile = await createProfile(body);
    return NextResponse.json({ success: true, data: newProfile }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST /api/profiles:', error);
    return NextResponse.json({ success: false, error: 'The profile could not be saved' }, { status: 500 });
  }
}
