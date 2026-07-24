import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdmin } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

// GET: fetch pricing data for admin editor
export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')

  const client = await getAdminClient()

  if (entity === 'venue_areas') {
    const { data } = await client.from('venue_areas').select('*, venue:venues(name)').order('sort_order')
    return NextResponse.json(data || [])
  }

  if (entity === 'food_packages') {
    const { data } = await client.from('food_packages').select('*').order('sort_order')
    return NextResponse.json(data || [])
  }

  if (entity === 'drink_packages') {
    const { data } = await client.from('drink_packages').select('*').order('sort_order')
    return NextResponse.json(data || [])
  }

  if (entity === 'addons') {
    const { data } = await client.from('addons').select('*, category:addon_categories(name)').order('sort_order')
    return NextResponse.json(data || [])
  }

  // Return all
  const [venueAreas, foodPackages, drinkPackages, addons, rules, settings] = await Promise.all([
    client.from('venue_areas').select('*, venue:venues(name)').order('sort_order'),
    client.from('food_packages').select('*').order('sort_order'),
    client.from('drink_packages').select('*').order('sort_order'),
    client.from('addons').select('*, category:addon_categories(name)').order('sort_order'),
    client.from('pricing_rules').select('*').eq('is_active', true),
    client.from('site_settings').select('key, value').in('key', [
      'booking:deposit_percentage', 'booking:tax_rate', 'booking:quote_validity_days',
    ]),
  ])

  const bookingSettings: Record<string, string> = {}
  for (const row of settings.data || []) {
    bookingSettings[row.key.replace('booking:', '')] = row.value
  }

  return NextResponse.json({
    venue_areas: venueAreas.data || [],
    food_packages: foodPackages.data || [],
    drink_packages: drinkPackages.data || [],
    addons: addons.data || [],
    pricing_rules: rules.data || [],
    settings: bookingSettings,
  })
}

// PATCH: update a single price field
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { entity_type, entity_id, field, value } = body

    if (!entity_type || !entity_id || !field || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const allowedEntities = ['venue_areas', 'food_packages', 'drink_packages', 'addons']
    if (!allowedEntities.includes(entity_type)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const { error } = await (await getAdminClient())
      .from(entity_type)
      .update({ [field]: value })
      .eq('id', entity_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update pricing' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}