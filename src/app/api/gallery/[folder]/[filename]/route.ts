import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

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
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  const { folder, filename: rawFilename } = await params;
  const filename = sanitizeFilename(rawFilename);

  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
  }

  if (!filename || filename !== rawFilename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const galleryDir = path.join(process.cwd(), 'public', 'gallery', folder);
  const filePath = path.join(galleryDir, filename);

  // Verify resolved path is within the gallery directory
  if (!filePath.startsWith(galleryDir)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
