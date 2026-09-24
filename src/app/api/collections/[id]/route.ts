import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SYSTEM_COLLECTIONS = ['favoriler', 'sonra bak'];

function isSystem(name: string) {
  return SYSTEM_COLLECTIONS.includes(name.toLowerCase());
}

// PUT /api/collections/[id] - rename collection
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Collection name is required' }, { status: 400 });
    }

    const col = await prisma.collection.findUnique({ where: { id: params.id } });
    if (!col) {
      return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
    }

    if (isSystem(col.name)) {
      return NextResponse.json({ success: false, error: 'System collections cannot be renamed' }, { status: 403 });
    }

    const existing = await prisma.collection.findFirst({ where: { name: name.trim() } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ success: false, error: 'A collection with this name already exists' }, { status: 409 });
    }

    const updated = await prisma.collection.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /api/collections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to rename collection' }, { status: 500 });
  }
}

// DELETE /api/collections/[id] - delete collection and remove from all profiles
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const col = await prisma.collection.findUnique({ where: { id: params.id } });
    if (!col) {
      return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
    }

    if (isSystem(col.name)) {
      return NextResponse.json({ success: false, error: 'System collections cannot be deleted' }, { status: 403 });
    }

    // Remove all ProfileCollection relations then the collection itself
    await prisma.profileCollection.deleteMany({ where: { collectionId: params.id } });
    await prisma.collection.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/collections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete collection' }, { status: 500 });
  }
}
