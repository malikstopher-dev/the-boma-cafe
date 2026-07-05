import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getBarCategories, saveBarCategory, deleteBarCategory, getBarItems, saveBarItem, deleteBarItem } from '@/lib/cms-supabase';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const [categories, items] = await Promise.all([getBarCategories(), getBarItems()]);
    return NextResponse.json({ categories, items });
  } catch (error) {
    console.error('Error reading bar menu:', error);
    return NextResponse.json({ error: 'Failed to read bar menu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();

    // Bar category: has name, no categoryId
    if (body.name !== undefined && !body.categoryId) {
      const category = await saveBarCategory(body);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true, data: category });
    }

    // Bar item: has categoryId
    if (body.categoryId !== undefined) {
      const item = await saveBarItem(body);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true, data: item });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error saving bar menu:', error);
    return NextResponse.json({ error: 'Failed to save bar menu' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();

    // Bar category: has id/name, no categoryId
    if ((body.id && body.name !== undefined) && !body.categoryId) {
      const category = await saveBarCategory(body);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true, data: category });
    }

    // Bar item: has categoryId
    if (body.categoryId !== undefined) {
      const item = await saveBarItem(body);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true, data: item });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error saving bar menu:', error);
    return NextResponse.json({ error: 'Failed to save bar menu' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const itemId = searchParams.get('itemId');

    if (id) {
      await deleteBarCategory(id);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true });
    }

    if (itemId) {
      await deleteBarItem(itemId);
      revalidatePath('/bar-menu');
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting bar menu:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
