import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { isSystemCollection, SYSTEM_COLLECTION_NAMES } from '@/lib/systemCollections';

export async function GET() {
  const [tags, collections] = await Promise.all([
    prisma.tag.findMany({ where: { profiles: { none: {} } }, select: { id: true, name: true, color: true }, orderBy: { name: 'asc' } }),
    prisma.collection.findMany({ where: { profiles: { none: {} } }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return NextResponse.json({ success: true, data: { tags, collections: collections.filter((item) => !isSystemCollection(item.name)) } });
}
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter((id: unknown) => typeof id === 'string') : [];
    const collectionIds = Array.isArray(body.collectionIds) ? body.collectionIds.filter((id: unknown) => typeof id === 'string') : [];
    const [tags, collections] = await prisma.$transaction([
      prisma.tag.deleteMany({ where: { id: { in: tagIds }, profiles: { none: {} } } }),
      prisma.collection.deleteMany({ where: { id: { in: collectionIds }, profiles: { none: {} }, NOT: SYSTEM_COLLECTION_NAMES.map((name) => ({ name })) } }),
    ]);
    return NextResponse.json({ success: true, data: { tags: tags.count, collections: collections.count } });
  } catch { return NextResponse.json({ success: false, error: 'The items could not be deleted' }, { status: 500 }); }
}
