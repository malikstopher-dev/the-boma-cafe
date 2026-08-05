import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const revalidate = 60

export async function GET() {
  const client = await getAdminClient()

  const [typesRes, venuesRes, areasRes, foodRes, drinkRes, addonCatsRes, addonsRes, settingsRes] = await Promise.all([
    client.from('booking_types').select('id,name,slug,description,base_price,capacity,deposit_required,duration_hours,is_active,sort_order').eq('is_active', true).order('sort_order'),
    client.from('venues').select('id,name,slug,description,address,is_active').eq('is_active', true),
    client.from('venue_areas').select('id,name,description,base_price,capacity,venue_id,is_active,sort_order').eq('is_active', true).order('sort_order'),
    client.from('food_packages').select('id,name,description,price_per_person,is_active,sort_order').eq('is_active', true).order('sort_order'),
    client.from('drink_packages').select('id,name,description,price_per_person,is_active,sort_order').eq('is_active', true).order('sort_order'),
    client.from('addon_categories').select('id,name,description,sort_order').order('sort_order'),
    client.from('addons').select('id,name,description,price,addon_category_id,is_active,sort_order').eq('is_active', true).order('sort_order'),
    client.from('site_settings').select('key, value').in('key', [
      'booking:deposit_percentage',
      'booking:tax_rate',
      'booking:min_advance_days',
      'booking:max_advance_days',
      'booking:enabled',
      'booking:business_hours_start',
      'booking:business_hours_end',
    ]),
  ])

  const settings: Record<string, string> = {}
  for (const row of settingsRes.data || []) {
    settings[row.key.replace('booking:', '')] = row.value
  }

  return NextResponse.json({
    booking_types: typesRes.data || [],
    venues: venuesRes.data || [],
    venue_areas: areasRes.data || [],
    food_packages: foodRes.data || [],
    drink_packages: drinkRes.data || [],
    addon_categories: addonCatsRes.data || [],
    addons: addonsRes.data || [],
    settings,
  })
}