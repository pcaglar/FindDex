import { NextRequest, NextResponse } from 'next/server';
import { getAllPlatforms, createCustomPlatform } from '@/lib/profileService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const platforms = await getAllPlatforms();
    return NextResponse.json({ success: true, data: platforms });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return NextResponse.json({ success: false, error: 'Platforms could not be loaded' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Platform name is required' },
        { status: 400 }
      );
    }

    const platform = await createCustomPlatform({
      name: body.name.trim(),
      icon: body.icon?.trim() || '⭐',
      color: body.color?.trim() || 'from-purple-500 to-indigo-600',
    });

    return NextResponse.json({ success: true, data: platform }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom platform:', error);
    return NextResponse.json(
      { success: false, error: 'The custom platform could not be created' },
      { status: 500 }
    );
  }
}
