import { NextRequest, NextResponse } from 'next/server';
import { findDuplicateProfiles } from '@/lib/duplicateDetection';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const data = await findDuplicateProfiles({
    username: searchParams.get('username') || '',
    name: searchParams.get('name') || '',
    urls: searchParams.getAll('url'),
    excludeId: searchParams.get('excludeId'),
  });
  return NextResponse.json({ success: true, data });
}
