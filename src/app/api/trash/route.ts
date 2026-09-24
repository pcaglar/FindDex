import { NextResponse } from 'next/server';
import { getProfiles, emptyTrash } from '@/lib/profileService';

export async function GET() {
  try {
    const trashed = await getProfiles({ includeDeleted: true });
    return NextResponse.json({ success: true, data: trashed });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json({ success: false, error: 'Trash could not be loaded' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const count = await emptyTrash();
    return NextResponse.json({
      success: true,
      message: `${count} profiles were permanently deleted from Trash`,
      count,
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return NextResponse.json({ success: false, error: 'Trash could not be emptied' }, { status: 500 });
  }
}
