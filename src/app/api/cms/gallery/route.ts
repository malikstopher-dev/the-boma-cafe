import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getGallery, saveGalleryItem, deleteGalleryItem, getGalleryBoards } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const gallery = await getGallery();
    const boards = await getGalleryBoards();
    return NextResponse.json({ gallery, boards });
  } catch (error) {
    console.error('Error reading gallery:', error);
    return NextResponse.json({ error: 'Failed to read gallery' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const item = await request.json();
    const saved = await saveGalleryItem(item);
    revalidatePath('/gallery');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const item = await request.json();
    const saved = await saveGalleryItem(item);
    revalidatePath('/gallery');
    revalidatePath('/');
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return NextResponse.json({ error: 'Failed to save gallery item' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        await saveGalleryItem(item);
      }
      revalidatePath('/gallery');
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error reordering gallery:', error);
    return NextResponse.json({ error: 'Failed to reorder gallery' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (id) {
      const result = await deleteGalleryItem(id);
      revalidatePath('/gallery');
      revalidatePath('/');
      return NextResponse.json({ success: result });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
