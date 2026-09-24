import { NextRequest, NextResponse } from 'next/server';
import { getProfileById, updateProfile, softDeleteProfile } from '@/lib/profileService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await getProfileById(params.id);
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error in GET /api/profiles/[id]:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await updateProfile(params.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error in PUT /api/profiles/[id]:', error);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

// DELETE = Soft delete to Trash!
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await softDeleteProfile(params.id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Profile moved to Trash' });
  } catch (error) {
    console.error('Error in DELETE /api/profiles/[id]:', error);
    return NextResponse.json({ success: false, error: 'Delete operation failed' }, { status: 500 });
  }
}
