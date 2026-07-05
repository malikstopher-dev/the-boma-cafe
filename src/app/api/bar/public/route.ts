import { NextResponse } from 'next/server';
import { getBarCategories, getBarItems } from '@/lib/cms-supabase';

export async function GET() {
  try {
    const [categories, items] = await Promise.all([getBarCategories(), getBarItems()]);
    const activeCategories = categories.filter((c: any) => c.isActive);
    const availableItems = items.filter((i: any) => i.isAvailable);
    return NextResponse.json({ categories: activeCategories, items: availableItems }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error reading public bar menu:', error);
    return NextResponse.json({ error: 'Failed to read bar menu' }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }
}
