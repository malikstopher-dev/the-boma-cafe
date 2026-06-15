import { NextRequest, NextResponse } from 'next/server';
import { getCategories, saveCategory, deleteCategory, getMenuItems, saveMenuItem, deleteMenuItem } from '@/lib/cms-supabase';
import { requireAdminOrKitchen } from '@/lib/auth/requireRole';

export async function GET(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const categories = getCategories();
    const menuItems = getMenuItems();
    return NextResponse.json({ categories, menuItems });
  } catch (error) {
    console.error('Error reading menu:', error);
    return NextResponse.json({ error: 'Failed to read menu' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();
    
    if (body.id && body.name !== undefined) {
      const category = saveCategory(body);
      return NextResponse.json({ success: true, data: category });
    }
    
    if (body.categoryId !== undefined) {
      const item = saveMenuItem(body);
      return NextResponse.json({ success: true, data: item });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error saving menu:', error);
    return NextResponse.json({ error: 'Failed to save menu' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdminOrKitchen(request)
  if (authError) return authError

  try {
    const body = await request.json();
    
    if (body.categoryId || (body.id && body.name !== undefined)) {
      const category = saveCategory(body);
      return NextResponse.json({ success: true, data: category });
    }
    
    const item = saveMenuItem(body);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error('Error saving menu:', error);
    return NextResponse.json({ error: 'Failed to save menu' }, { status: 500 });
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
      deleteCategory(id);
      return NextResponse.json({ success: true });
    }
    
    if (itemId) {
      deleteMenuItem(itemId);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}