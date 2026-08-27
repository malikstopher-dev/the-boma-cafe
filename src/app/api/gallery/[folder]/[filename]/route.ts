import { NextRequest, NextResponse } from 'next/server';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { getAdminClient } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET, removeStorageObjectOrQueue } from '@/lib/storage/media';

export const dynamic = 'force-dynamic'

const VALID_FOLDERS = ['events', 'food', 'venue', 'people', 'promotions'];

function sanitizeFilename(name: string): string {
  // Strip path separators and null bytes to prevent traversal
  return name.replace(/[/\\:*?"<>|\x00]/g, '').replace(/\.\./g, '').trim();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string; filename: string }> }
) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError

  const { folder, filename: rawFilename } = await params;
  const filename = sanitizeFilename(rawFilename);

  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
  }

  if (!filename || filename !== rawFilename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  try {
    const storagePath = `gallery/${folder}/${filename}`;
    const { data, error } = await getAdminClient().storage
      .from(PUBLIC_MEDIA_BUCKET)
      .list(`gallery/${folder}`, { search: filename, limit: 10 });
    if (error) throw error;
    if (!(data || []).some(file => file.name === filename)) {
      return NextResponse.json({ error: 'Stored file not found; bundled gallery assets are immutable' }, { status: 404 });
    }
    if (!(await removeStorageObjectOrQueue(PUBLIC_MEDIA_BUCKET, storagePath))) {
      return NextResponse.json({ error: 'Failed to delete or schedule cleanup' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
