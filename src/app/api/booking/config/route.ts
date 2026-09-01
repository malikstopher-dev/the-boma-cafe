import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export const revalidate = 60

export async function GET() {
  try {
    const client = await getAdminClient()

    const [typesRes, venuesRes, areasRes, foodRes, drinkRes, addonCatsRes, addonsRes, settingsRes] = await Promise.all([
      client.from('booking_types').select('id,name,slug,description,icon,min_guests,max_guests,min_duration_hours,max_duration_hours,is_active,sort_order').eq('is_active', true).order('sort_order'),
      client.from('venues').select('id,name,slug,description,is_active').eq('is_active', true),
      client.from('venue_areas').select('id,name,description,capacity_min,capacity_max,venue_id,is_active,sort_order').eq('is_active', true).order('sort_order'),
      client.from('food_packages').select('id,name,description,per_person_weekday,per_person_weekend,child_price_weekday,child_price_weekend,min_guests,is_active,sort_order').eq('is_active', true).order('sort_order'),
      client.from('drink_packages').select('id,name,description,pricing_model,amount_weekday,amount_weekend,min_guests,is_active,sort_order').eq('is_active', true).order('sort_order'),
      client.from('addon_categories').select('id,name,description,sort_order').order('sort_order'),
      client.from('addons').select('id,name,description,icon,pricing_model,amount_weekday,amount_weekend,category_id,max_quantity,is_active,sort_order').eq('is_active', true).order('sort_order'),
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

    const queryResults = [
      { source: 'booking_types', result: typesRes },
      { source: 'venues', result: venuesRes },
      { source: 'venue_areas', result: areasRes },
      { source: 'food_packages', result: foodRes },
      { source: 'drink_packages', result: drinkRes },
      { source: 'addon_categories', result: addonCatsRes },
      { source: 'addons', result: addonsRes },
      { source: 'site_settings', result: settingsRes },
    ]
    const failedQuery = queryResults.find(({ result }) => result.error)

    if (failedQuery) {
      console.error(`[booking/config] Failed to load ${failedQuery.source}`, failedQuery.result.error)
      return NextResponse.json({ error: 'Failed to load booking configuration' }, { status: 500 })
    }

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
  } catch (error) {
    console.error('[booking/config] Unexpected configuration error', error)
    return NextResponse.json({ error: 'Failed to load booking configuration' }, { status: 500 })
  }
}
