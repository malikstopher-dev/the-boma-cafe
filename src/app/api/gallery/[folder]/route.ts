import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VALID_FOLDERS = ['events', 'food', 'venue', 'people', 'promotions'];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

export async function GET(
  request: NextRequest,
  { params }: { params: { folder: string } }
) {
  const folder = params.folder;
  
  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json(
      { error: 'Invalid folder' },
      { status: 400 }
    );
  }
  
  const galleryPath = path.join(process.cwd(), 'public', 'gallery', folder);
  
  try {
    if (!fs.existsSync(galleryPath)) {
      return NextResponse.json({ images: [] });
    }
    
    const files = fs.readdirSync(galleryPath);
    const images = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return IMAGE_EXTENSIONS.includes(ext);
      })
      .map(file => `/gallery/${folder}/${file}`);
    
    images.sort();
    
    return NextResponse.json({ images });
  } catch (error) {
    console.error(`Error reading gallery folder ${folder}:`, error);
    return NextResponse.json(
      { error: 'Failed to read gallery folder' },
      { status: 500 }
    );
  }
}
