import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const VALID_FOLDERS = ['events', 'food', 'venue', 'people', 'promotions'];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { folder: string; filename: string } }
) {
  const { folder, filename } = params;

  if (!VALID_FOLDERS.includes(folder)) {
    return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'gallery', folder, filename);

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
