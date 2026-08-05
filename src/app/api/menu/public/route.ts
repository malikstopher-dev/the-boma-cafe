import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const revalidate = 60

function safeJsonParse(str: string | null): any[] | null {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}

export async function GET() {
  try {
    const client = getAdminClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      client.from('menu_categories').select('id,name,description,order_index,is_active,is_bar').order('order_index', { ascending: true }),
      client.from('menu_items').select('id,category_id,name,description,price,image,sizes,add_ons,options,is_available,is_featured,is_on_promo,promo_badge,order_index,available_for_all_order_types').eq('is_available', true).order('order_index', { ascending: true }).limit(300),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (itemsRes.error) throw itemsRes.error;

    const categories = (categoriesRes.data || [])
      .filter((c: any) => c.is_active)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        isActive: c.is_active,
        isBar: c.is_bar === true,
        order: c.order_index,
      }));

    const menuItems = (itemsRes.data || []).map((item: any) => {
      const sizes = safeJsonParse(item.sizes)
      const addOns = safeJsonParse(item.add_ons)
      const options = safeJsonParse(item.options)
      return {
        id: item.id,
        categoryId: item.category_id,
        name: item.name,
        description: item.description,
        price: Number(item.price) || 0,
        image: item.image,
        sizes: sizes ? sizes.map((s: any) => ({ ...s, price: Number(s.price) })) : null,
        addOns: addOns ? addOns.map((a: any) => ({ ...a, price: Number(a.price) })) : null,
        options,
        isAvailable: item.is_available,
        isFeatured: item.is_featured,
        isOnPromo: item.is_on_promo,
        promoBadge: item.promo_badge,
        availableForAllOrderTypes: item.available_for_all_order_types !== false,
        order: item.order_index,
      };
    });

    return NextResponse.json({ categories, menuItems });
  } catch (error) {
    console.error('Error reading public menu:', error);
    return NextResponse.json({ error: 'Failed to read menu' }, { status: 500 });
  }
}
