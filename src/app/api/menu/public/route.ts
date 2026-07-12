import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = getAdminClient();

    const [categoriesRes, itemsRes] = await Promise.all([
      client.from('menu_categories').select('id,name,description,order_index,is_active').order('order_index', { ascending: true }),
      client.from('menu_items').select('id,category_id,name,description,price,image,sizes,add_ons,options,is_available,is_featured,is_on_promo,promo_badge,order_index').order('order_index', { ascending: true }),
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
        order: c.order_index,
      }));

    const menuItems = (itemsRes.data || [])
      .filter((m: any) => m.is_available)
      .map((item: any) => {
        let sizes = null;
        let addOns = null;
        let options = null;
        try { sizes = item.sizes ? JSON.parse(item.sizes) : null; } catch { sizes = null; }
        try { addOns = item.add_ons ? JSON.parse(item.add_ons) : null; } catch { addOns = null; }
        try { options = item.options ? JSON.parse(item.options) : null; } catch { options = null; }
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
          order: item.order_index,
        };
      });

    return NextResponse.json({ categories, menuItems }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Error reading public menu:', error);
    return NextResponse.json({ error: 'Failed to read menu' }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  }
}
