import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/collections - return all collections with profile count
export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        profiles: {
          select: { profileId: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const result = collections.map((col) => ({
      id: col.id,
      name: col.name,
      count: col.profiles.length,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('GET /api/collections error:', err);
    return NextResponse.json({ success: false, error: 'Failed to get collections' }, { status: 500 });
  }
}
