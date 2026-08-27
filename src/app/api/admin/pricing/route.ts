import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { requireAdminPermission } from '@/lib/auth/requireRole'

export const dynamic = 'force-dynamic'

// GET: fetch pricing data for admin editor
export async function GET(request: NextRequest) {
  const authError = await requireAdminPermission(request, 'pricing.write')
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
  const authError = await requireAdminPermission(request, 'pricing.write')
  if (authError) return authError

  try {
    const body = await request.json()
    const { entity_type, entity_id, field, value } = body

    if (!entity_type || !entity_id || !field || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const allowedFields: Record<string, string[]> = {
      venue_areas: ['base_price_weekday', 'base_price_weekend', 'minimum_spend', 'hourly_rate_weekday', 'hourly_rate_weekend', 'capacity_min', 'capacity_max'],
      food_packages: ['per_person_weekday', 'per_person_weekend', 'child_price_weekday', 'child_price_weekend', 'min_guests'],
      drink_packages: ['amount_weekday', 'amount_weekend', 'min_guests', 'pricing_model'],
      addons: ['amount_weekday', 'amount_weekend', 'pricing_model', 'max_quantity'],
    }
    const entityFields = allowedFields[entity_type]
    if (!entityFields) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }
    if (!entityFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid pricing field' }, { status: 400 })
    }

    const allowedModels = entity_type === 'drink_packages'
      ? ['per_person', 'flat_rate', 'consumption']
      : ['flat_fee', 'per_person', 'per_hour']
    if (field === 'pricing_model') {
      if (typeof value !== 'string' || !allowedModels.includes(value)) {
        return NextResponse.json({ error: 'Invalid pricing model' }, { status: 400 })
      }
    } else if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Number(value)))) {
      return NextResponse.json({ error: 'Pricing value must be numeric' }, { status: 400 })
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
