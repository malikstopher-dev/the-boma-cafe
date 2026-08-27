import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

const VALID_UPLOAD_FOLDERS = ['misc', 'events', 'food', 'venue', 'people', 'promotions', 'menu', 'gallery', 'marketing'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

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

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const fileName = `${timestamp}-${baseName}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Verify resolved path is within the upload directory
    if (!filePath.startsWith(uploadDir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/uploads/${folder}/${fileName}`;

    return NextResponse.json({ 
      success: true, 
      url,
      fileName,
      originalName: file.name
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
