import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateExternalRequest, externalCorsHeaders } from '@/lib/externalApi';
import { findDuplicateProfiles } from '@/lib/duplicateDetection';
import { cleanupDownloadedImages, downloadAndStoreImage } from '@/lib/remoteImage';
import { createProfile } from '@/lib/profileService';

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: externalCorsHeaders });
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: externalCorsHeaders }); }

export async function POST(request: NextRequest) {
  let downloadedUrls: string[] = [];
  try {
    if (!await authenticateExternalRequest(request)) return json({ success: false, error: 'Invalid or missing API key' }, 401);
    const body = await request.json();
    const username = String(body.username || '').replace(/^@/, '').trim();
    const displayName = String(body.displayName || username).trim();
    const profileUrl = String(body.profileUrl || '').trim();
    if (!username || !profileUrl) return json({ success: false, error: 'Username and profile URL are required' }, 400);
    const duplicates = await findDuplicateProfiles({ username, name: displayName, urls: [profileUrl] });
    if (duplicates.length) return json({ success: false, error: 'This profile may already exist in FindDex.', duplicates }, 409);
    let localImageUrl = '';
    const selectedImageUrl = String(body.coverImageUrl || body.avatarUrl || '').trim();
    if (selectedImageUrl) {
      try {
        localImageUrl = await downloadAndStoreImage(selectedImageUrl);
        downloadedUrls = [localImageUrl];
      }
      catch (error: any) { return json({ success: false, error: error?.message || 'The profile photo could not be downloaded' }, 422); }
    }
    const instagram = await prisma.platform.findUnique({ where: { key: 'instagram' } });
    if (!instagram) {
      await cleanupDownloadedImages(downloadedUrls);
      return json({ success: false, error: 'The Instagram platform was not found' }, 500);
    }
    const tags = Array.isArray(body.tags) ? body.tags : String(body.tags || '').split(',');
    const profile = await createProfile({
      username, displayName, avatarUrl: localImageUrl, bio: String(body.bio || '').trim(), notes: String(body.notes || '').trim(),
      isVerified: Boolean(body.isVerified), tags: tags.map((tag: unknown) => String(tag).trim()).filter(Boolean),
      platformLinks: [{ platformId: instagram.id, url: profileUrl }],
      images: localImageUrl ? [{ url: localImageUrl, isCover: true, sortOrder: 0 }] : [],
    });
    return json({ success: true, data: profile }, 201);
  } catch (error) {
    await cleanupDownloadedImages(downloadedUrls);
    console.error('External profile creation failed:', error);
    return json({ success: false, error: 'The profile could not be saved' }, 500);
  }
}
