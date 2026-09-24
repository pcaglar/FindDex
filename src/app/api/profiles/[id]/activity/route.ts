import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const profile = await prisma.profile.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });

  const logs = await prisma.activityLog.findMany({
    where: { profileId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ success: true, data: logs });
}
