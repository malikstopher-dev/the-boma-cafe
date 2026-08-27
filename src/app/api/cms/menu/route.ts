import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCategories, saveCategory, deleteCategory, getMenuItems, saveMenuItem, deleteMenuItem } from '@/lib/cms-supabase';
import { requireAdminPermission } from '@/lib/auth/requireRole';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  let categories: any[] | null = null;
  let items: any[] | null = null;
  const errors: Record<string, any> = {};

  try {
    categories = await getCategories();
  } catch (error: any) {
    errors.categories = {
      message: error?.message || String(error),
      code: error?.code || null,
    };
  }

  try {
    items = await getMenuItems();
  } catch (error: any) {
    errors.items = {
      message: error?.message || String(error),
      code: error?.code || null,
    };
  }

  if (Object.keys(errors).length > 0) {
    const hasCategories = categories && categories.length > 0;
    const hasItems = items && items.length > 0;
    const status = (hasCategories || hasItems) ? 200 : 500;
    return NextResponse.json(
      {
        error: status === 500 ? 'Failed to read menu' : 'Partial failure reading menu',
        errors,
        categories: categories || [],
        items: items || [],
        categoriesCount: categories?.length || 0,
        itemsCount: items?.length || 0,
      },
      { status }
    );
  }

  return NextResponse.json({ categories, menuItems: items });
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    
    // Category: has name, no categoryId
    if (body.name !== undefined && !body.categoryId) {
      const category = await saveCategory(body);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: category });
    }
    
    // Menu item: has categoryId
    if (body.categoryId !== undefined) {
      const item = await saveMenuItem(body);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: item });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error saving menu:', error);
    return NextResponse.json({ error: 'Failed to save menu' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const body = await request.json();
    
    // Category: has id/name, no categoryId
    if ((body.id && body.name !== undefined) && !body.categoryId) {
      const category = await saveCategory(body);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: category });
    }
    
    // Menu item: has categoryId
    if (body.categoryId !== undefined) {
      const item = await saveMenuItem(body);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true, data: item });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error saving menu:', error);
    return NextResponse.json({ error: 'Failed to save menu' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'cms.write')
  if (authError) return authError

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const itemId = searchParams.get('itemId');
    
    if (id) {
      await deleteCategory(id);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    
    if (itemId) {
      await deleteMenuItem(itemId);
      revalidatePath('/menu');
      revalidatePath('/');
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
