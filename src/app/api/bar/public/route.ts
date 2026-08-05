import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const revalidate = 60

export async function GET() {
  try {
    const client = getAdminClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      client.from('bar_categories').select('id,name,order_index,is_active').order('order_index', { ascending: true }).filter('is_active', 'eq', true),
      client.from('bar_items').select('id,category_id,name,bottle,single_price,glass_price,shot_price,price,order_index,is_available,available_for_pickup,is_alcohol').order('order_index', { ascending: true }).filter('is_available', 'eq', true).limit(200),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const categories = (categoriesRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      isActive: c.is_active,
      order: c.order_index,
    }));

    const items = (itemsRes.data || []).map((i: any) => ({
      id: i.id,
      categoryId: i.category_id,
      name: i.name,
      bottle: i.bottle ? Number(i.bottle) : null,
      singlePrice: i.single_price ? Number(i.single_price) : null,
      glassPrice: i.glass_price ? Number(i.glass_price) : null,
      shotPrice: i.shot_price ? Number(i.shot_price) : null,
      price: i.price,
      isAvailable: i.is_available,
      availableForPickup: i.available_for_pickup !== false,
      isAlcohol: i.is_alcohol === true,
      order: i.order_index,
    }));

    return NextResponse.json({ categories, items });
  } catch (error) {
    console.error('Error reading public bar menu:', error);
    return NextResponse.json({ error: 'Failed to read bar menu' }, { status: 500 });
  }
}
