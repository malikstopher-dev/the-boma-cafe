import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const client = await getAdminClient()

  const [typesRes, venuesRes, areasRes, foodRes, drinkRes, addonCatsRes, addonsRes, settingsRes] = await Promise.all([
    client.from('booking_types').select('*').eq('is_active', true).order('sort_order'),
    client.from('venues').select('*').eq('is_active', true),
    client.from('venue_areas').select('*').eq('is_active', true).order('sort_order'),
    client.from('food_packages').select('*').eq('is_active', true).order('sort_order'),
    client.from('drink_packages').select('*').eq('is_active', true).order('sort_order'),
    client.from('addon_categories').select('*').order('sort_order'),
    client.from('addons').select('*').eq('is_active', true).order('sort_order'),
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