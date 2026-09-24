import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT /api/platforms/[id] - Update custom platform
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: params.id },
      include: { _count: { select: { links: true } } },
    });

    if (!platform) {
      return NextResponse.json({ success: false, error: 'Platform not found' }, { status: 404 });
    }

    if (!platform.isCustom) {
      return NextResponse.json(
        { success: false, error: 'System platforms cannot be edited' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updated = await prisma.platform.update({
      where: { id: params.id },
      data: {
        name: body.name !== undefined ? body.name.trim() : platform.name,
        icon: body.icon !== undefined ? body.icon.trim() : platform.icon,
        color: body.color !== undefined ? body.color.trim() : platform.color,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating platform:', error);
    return NextResponse.json({ success: false, error: 'Platform could not be updated' }, { status: 500 });
  }
}

// DELETE /api/platforms/[id] - Delete custom platform and its links
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const platform = await prisma.platform.findUnique({
      where: { id: params.id },
      include: { _count: { select: { links: true } } },
    });

    if (!platform) {
      return NextResponse.json({ success: false, error: 'Platform not found' }, { status: 404 });
    }

    if (!platform.isCustom) {
      return NextResponse.json(
        { success: false, error: 'System platforms cannot be deleted' },
        { status: 403 }
      );
    }

    await prisma.platform.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: `Platform "${platform.name}" and ${platform._count.links} linked profile URLs were deleted`,
    });
  } catch (error) {
    console.error('Error deleting platform:', error);
    return NextResponse.json({ success: false, error: 'Platform silinemedi' }, { status: 500 });
  }
}
