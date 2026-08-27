import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { uploadPublicImage } from '@/lib/storage/media';

export const dynamic = 'force-dynamic'

const VALID_FOLDERS = ['events', 'food', 'venue', 'people', 'promotions'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!VALID_FOLDERS.includes(folder)) {
      return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const uploaded = await uploadPublicImage(file, `gallery/${folder}`);

    return NextResponse.json({ 
      success: true, 
      url: uploaded.url,
      name: uploaded.path.split('/').pop(),
      storagePath: uploaded.path,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
