import { NextRequest, NextResponse } from 'next/server';
import { getGallery, saveGalleryItem, deleteGalleryItem, getGalleryBoards } from '@/lib/cms-supabase';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const gallery = getGallery();
    const boards = getGalleryBoards();
    return NextResponse.json({ gallery, boards });
  } catch (error) {
    console.error('Error reading gallery:', error);
    return NextResponse.json({ error: 'Failed to read gallery' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const item = await request.json();
    const saved = saveGalleryItem(item);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const item = await request.json();
    const saved = saveGalleryItem(item);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();
    if (body.items && Array.isArray(body.items)) {
      body.items.forEach((item: any) => saveGalleryItem(item));
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering gallery:', error);
    return NextResponse.json({ error: 'Failed to reorder gallery' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const result = deleteGalleryItem(id);
      return NextResponse.json({ success: result });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}