import { NextRequest, NextResponse } from 'next/server';
import { restoreProfile, permanentlyDeleteProfile } from '@/lib/profileService';

// POST /api/trash/[id] -> Restore profile
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await restoreProfile(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'The profile could not be restored' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Profile restored successfully' });
  } catch (error) {
    console.error('Error in restore profile:', error);
    return NextResponse.json({ success: false, error: 'Restore failed' }, { status: 500 });
  }
}

// DELETE /api/trash/[id] -> Permanently delete profile + clean file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await permanentlyDeleteProfile(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Profile permanently deleted' });
  } catch (error) {
    console.error('Error in permanent delete:', error);
    return NextResponse.json({ success: false, error: 'Permanent deletion failed' }, { status: 500 });
  }
}
