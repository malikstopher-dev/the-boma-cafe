import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdminPermission } from '@/lib/auth/requireRole';
import { getAdminClient } from '@/lib/supabase';
import { PUBLIC_MEDIA_BUCKET } from '@/lib/storage/media';

export const dynamic = 'force-dynamic'

const VALID_FOLDERS = ['events', 'food', 'venue', 'people', 'promotions'];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  const authError = await requireAdminPermission(request, 'media.write')
  if (authError) return authError
  const { folder } = await params;
  
  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json(
      { error: 'Invalid folder' },
      { status: 400 }
    );
  }
  
  const galleryPath = path.join(process.cwd(), 'public', 'gallery', folder);
  
  try {
    const files = fs.existsSync(galleryPath) ? fs.readdirSync(galleryPath) : [];
    const bundledImages = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .map(file => `/gallery/${folder}/${file}`);
    
    const client = getAdminClient();
    const { data: storedFiles, error: storageError } = await client.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .list(`gallery/${folder}`, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (storageError) throw storageError;

    const storedImages = (storedFiles || [])
      .filter(file => IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)))
      .map(file => client.storage.from(PUBLIC_MEDIA_BUCKET).getPublicUrl(`gallery/${folder}/${file.name}`).data.publicUrl);
    const images = [...bundledImages, ...storedImages].sort();
    
    return NextResponse.json({ images });
  } catch (error) {
    console.error(`Error reading gallery folder ${folder}:`, error);
    return NextResponse.json(
      { error: 'Failed to read gallery folder' },
      { status: 500 }
    );
  }
}
