import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/tags - return all tags with profile count
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        profiles: {
          select: { profileId: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      count: tag.profiles.length,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /api/tags error:', err);
    return NextResponse.json({ success: false, error: 'Failed to get tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Tag name is required' }, { status: 400 });
    }
    const tag = await prisma.tag.create({
      data: { name, color: body.color || 'pink' },
    });
    return NextResponse.json({ success: true, data: { ...tag, count: 0 } }, { status: 201 });
  } catch (error) {
    console.error('POST /api/tags error:', error);
    return NextResponse.json({ success: false, error: 'The tag could not be created or already exists' }, { status: 409 });
  }
}
