import { NextResponse } from 'next/server';
import { getCategories, getMenuItems } from '@/lib/cms-supabase';

export async function GET() {
  try {
    const allCategories = await getCategories();
    const allItems = await getMenuItems();

    const categories = allCategories.filter((c: any) => c.isActive);
    const menuItems = allItems.filter((m: any) => m.isAvailable);

    return NextResponse.json({ categories, menuItems }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error reading public menu:', error);
    return NextResponse.json({ error: 'Failed to read menu' }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }
}
