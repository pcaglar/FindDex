import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT /api/tags/[id] - rename tag
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, color } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Tag name is required' }, { status: 400 });
    }

    const existing = await prisma.tag.findFirst({ where: { name: name.trim() } });
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ success: false, error: 'A tag with this name already exists' }, { status: 409 });
    }

    const updated = await prisma.tag.update({
      where: { id: params.id },
      data: { name: name.trim(), ...(color ? { color } : {}) },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('PUT /api/tags/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to rename tag' }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - delete tag and remove from all profiles
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tag = await prisma.tag.findUnique({ where: { id: params.id } });
    if (!tag) {
      return NextResponse.json({ success: false, error: 'Tag not found' }, { status: 404 });
    }

    // Delete all ProfileTag relations then the tag itself
    await prisma.profileTag.deleteMany({ where: { tagId: params.id } });
    await prisma.tag.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/tags/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete tag' }, { status: 500 });
  }
}
