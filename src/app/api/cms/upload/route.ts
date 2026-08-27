import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { uploadPublicImage } from '@/lib/storage/media';

export const dynamic = 'force-dynamic'

const VALID_UPLOAD_FOLDERS = ['misc', 'events', 'food', 'venue', 'people', 'promotions', 'menu', 'gallery', 'marketing'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!VALID_UPLOAD_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const uploaded = await uploadPublicImage(file, `cms/${folder}`);

    return NextResponse.json({ 
      success: true, 
      url: uploaded.url,
      fileName: uploaded.path.split('/').pop(),
      storagePath: uploaded.path,
      originalName: file.name
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
