import { getAdminClient } from '@/lib/supabase'
import {
  type VenueArea,
  type FoodPackage,
  type DrinkPackage,
  type Addon,
  type QuoteItem,
} from '@/types/booking'
import { isWeekend, isPeakSeason, calculateTax } from './utils'
import { getBookingSettings } from './settings'

export interface CalculationInput {
  venue_area_id: string
  food_package_id: string | null
  drink_package_id: string | null
  addons: Array<{ id: string; quantity: number }>
  adults: number
  children: number
  booking_date: string
  duration_hours: number
}

export interface CalculationLineItem {
  label: string
  description: string | null
  item_type: QuoteItem['item_type']
  reference_id: string | null
  quantity: number
  unit_price: number
  total: number
  sort_order: number
}

export interface CalculationResult {
  line_items: CalculationLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_percentage: number
  deposit_amount: number
  balance_amount: number
}

export async function fetchPricingData(input: CalculationInput): Promise<{
  venue_area: VenueArea | null
  food_package: FoodPackage | null
  drink_package: DrinkPackage | null
  addonDetails: Addon[]
}> {
  const client = await getAdminClient()
  const weekend = isWeekend(input.booking_date)
  const peak = isPeakSeason(input.booking_date)

  const [venueRes, foodRes, drinkRes, addonRes] = await Promise.all([
    client.from('venue_areas').select('*').eq('id', input.venue_area_id).single(),
    input.food_package_id
      ? client.from('food_packages').select('*').eq('id', input.food_package_id).single()
      : Promise.resolve({ data: null, error: null }),
    input.drink_package_id
      ? client.from('drink_packages').select('*').eq('id', input.drink_package_id).single()
      : Promise.resolve({ data: null, error: null }),
    input.addons.length > 0
      ? client.from('addons').select('*').in('id', input.addons.map(a => a.id))
      : Promise.resolve({ data: [], error: null }),
  ])

  return {
    venue_area: venueRes.data,
    food_package: foodRes?.data || null,
    drink_package: drinkRes?.data || null,
    addonDetails: (addonRes?.data || []) as Addon[],
  }
}

export async function calculateQuotation(input: CalculationInput): Promise<CalculationResult> {
  const { venue_area, food_package, drink_package, addonDetails } = await fetchPricingData(input)
  const settings = await getBookingSettings()
  const weekend = isWeekend(input.booking_date)
  const line_items: CalculationLineItem[] = []

  // 1. Venue Area
  if (venue_area) {
    const venuePrice = weekend ? venue_area.base_price_weekend : venue_area.base_price_weekday
    const hourlyRate = weekend ? venue_area.hourly_rate_weekend : venue_area.hourly_rate_weekday
    const venueTotal = Math.max(
      venuePrice + (hourlyRate * Math.max(0, input.duration_hours - 1)),
      venue_area.minimum_spend
    )
    line_items.push({
      label: `Venue: ${venue_area.name}`,
      description: venue_area.description,
      item_type: 'venue_area',
      reference_id: venue_area.id,
      quantity: 1,
      unit_price: venueTotal,
      total: venueTotal,
      sort_order: 1,
    })
  }

  // 2. Food Package
  if (food_package) {
    const adultPrice = weekend ? food_package.per_person_weekend : food_package.per_person_weekday
    const childPrice = weekend
      ? (food_package.child_price_weekend ?? adultPrice * (food_package.child_multiplier ?? 0.5))
      : (food_package.child_price_weekday ?? adultPrice * (food_package.child_multiplier ?? 0.5))
    const foodAdultTotal = adultPrice * input.adults
    const foodChildTotal = childPrice * input.children
    const foodTotal = foodAdultTotal + foodChildTotal

    line_items.push({
      label: `Food Package: ${food_package.name} (${input.adults} adults × ${formatPrice(adultPrice)})`,
      description: `${input.children > 0 ? `${input.children} children × ${formatPrice(childPrice)}, ` : ''}${food_package.description || ''}`,
      item_type: 'food_package',
      reference_id: food_package.id,
      quantity: input.adults + input.children,
      unit_price: adultPrice,
      total: foodTotal,
      sort_order: 2,
    })
  }

  // 3. Drink Package
  if (drink_package) {
    const drinkPrice = weekend ? drink_package.amount_weekend : drink_package.amount_weekday
    let drinkTotal = 0
    let drinkLabel = `Drinks: ${drink_package.name}`

    if (drink_package.pricing_model === 'per_person') {
      drinkTotal = drinkPrice * input.adults
      drinkLabel += ` (${input.adults} guests × ${formatPrice(drinkPrice)})`
    } else if (drink_package.pricing_model === 'flat_rate') {
      drinkTotal = drinkPrice
    } else {
      drinkTotal = 0
    }

    line_items.push({
      label: drinkLabel,
      description: drink_package.description,
      item_type: 'drink_package',
      reference_id: drink_package.id,
      quantity: drink_package.pricing_model === 'per_person' ? input.adults : 1,
      unit_price: drinkPrice,
      total: drinkTotal,
      sort_order: 3,
    })
  }

  // 4. Add-ons
  let sortOrder = 4
  for (const selection of input.addons) {
    const addon = addonDetails.find(a => a.id === selection.id)
    if (!addon || !addon.is_active) continue

    const addonPrice = weekend ? addon.amount_weekend : addon.amount_weekday
    let addonTotal = 0

    if (addon.pricing_model === 'flat_fee') {
      addonTotal = addonPrice * selection.quantity
    } else if (addon.pricing_model === 'per_person') {
      addonTotal = addonPrice * input.adults * selection.quantity
    } else if (addon.pricing_model === 'per_hour') {
      addonTotal = addonPrice * input.duration_hours * selection.quantity
    }

    const qtyLabel = addon.pricing_model === 'flat_fee'
      ? `× ${selection.quantity}`
      : addon.pricing_model === 'per_person'
        ? `× ${input.adults} guests × ${selection.quantity}`
        : `× ${input.duration_hours}h × ${selection.quantity}`

    line_items.push({
      label: `${addon.name} ${qtyLabel}`,
      description: addon.description,
      item_type: 'addon',
      reference_id: addon.id,
      quantity: selection.quantity,
      unit_price: addonPrice,
      total: addonTotal,
      sort_order: sortOrder++,
    })
  }

  // 5. Calculate totals
  const subtotal = line_items.reduce((sum, item) => sum + item.total, 0)

  // Apply minimum spend from venue area
  const effectiveSubtotal = venue_area ? Math.max(subtotal, venue_area.minimum_spend) : subtotal

  const tax_amount = calculateTax(effectiveSubtotal, settings.tax_rate)
  const total = effectiveSubtotal + tax_amount
  const deposit_amount = total * (settings.deposit_percentage / 100)
  const balance_amount = total - deposit_amount

  return {
    line_items,
    subtotal: effectiveSubtotal,
    tax_rate: settings.tax_rate,
    tax_amount,
    total,
    deposit_percentage: settings.deposit_percentage,
    deposit_amount,
    balance_amount,
  }
}

export function calculateQuotationFromWizard(
  pricingData: Awaited<ReturnType<typeof fetchPricingData>>,
  input: CalculationInput
): CalculationResult {
  const { venue_area, food_package, drink_package, addonDetails } = pricingData
  const weekend = isWeekend(input.booking_date)
  const settings = {
    deposit_percentage: 30,
    tax_rate: 0,
  }
  const line_items: CalculationLineItem[] = []

  // Same calculation logic as above but synchronous, using pre-fetched data
  if (venue_area) {
    const venuePrice = weekend ? venue_area.base_price_weekend : venue_area.base_price_weekday
    const hourlyRate = weekend ? venue_area.hourly_rate_weekend : venue_area.hourly_rate_weekday
    const venueTotal = Math.max(
      venuePrice + (hourlyRate * Math.max(0, input.duration_hours - 1)),
      venue_area.minimum_spend
    )
    line_items.push({
      label: `Venue: ${venue_area.name}`,
      description: venue_area.description,
      item_type: 'venue_area',
      reference_id: venue_area.id,
      quantity: 1,
      unit_price: venueTotal,
      total: venueTotal,
      sort_order: 1,
    })
  }

  if (food_package) {
    const adultPrice = weekend ? food_package.per_person_weekend : food_package.per_person_weekday
    const childPrice = weekend
      ? (food_package.child_price_weekend ?? adultPrice * (food_package.child_multiplier ?? 0.5))
      : (food_package.child_price_weekday ?? adultPrice * (food_package.child_multiplier ?? 0.5))
    const foodTotal = (adultPrice * input.adults) + (childPrice * input.children)
    line_items.push({
      label: `Food: ${food_package.name} (${input.adults} adults × ${formatPrice(adultPrice)})`,
      description: input.children > 0 ? `${input.children} children × ${formatPrice(childPrice)}` : null,
      item_type: 'food_package',
      reference_id: food_package.id,
      quantity: input.adults + input.children,
      unit_price: adultPrice,
      total: foodTotal,
      sort_order: 2,
    })
  }

  if (drink_package) {
    const drinkPrice = weekend ? drink_package.amount_weekend : drink_package.amount_weekday
    let drinkTotal = 0
    if (drink_package.pricing_model === 'per_person') {
      drinkTotal = drinkPrice * input.adults
    } else if (drink_package.pricing_model === 'flat_rate') {
      drinkTotal = drinkPrice
    }
    line_items.push({
      label: `Drinks: ${drink_package.name}`,
      description: drink_package.description,
      item_type: 'drink_package',
      reference_id: drink_package.id,
      quantity: drink_package.pricing_model === 'per_person' ? input.adults : 1,
      unit_price: drinkPrice,
      total: drinkTotal,
      sort_order: 3,
    })
  }

  let sortOrder = 4
  for (const selection of input.addons) {
    const addon = addonDetails.find(a => a.id === selection.id)
    if (!addon || !addon.is_active) continue
    const addonPrice = weekend ? addon.amount_weekend : addon.amount_weekday
    let addonTotal = 0
    if (addon.pricing_model === 'flat_fee') addonTotal = addonPrice * selection.quantity
    else if (addon.pricing_model === 'per_person') addonTotal = addonPrice * input.adults * selection.quantity
    else if (addon.pricing_model === 'per_hour') addonTotal = addonPrice * input.duration_hours * selection.quantity

    line_items.push({
      label: addon.name,
      description: addon.description,
      item_type: 'addon',
      reference_id: addon.id,
      quantity: selection.quantity,
      unit_price: addonPrice,
      total: addonTotal,
      sort_order: sortOrder++,
    })
  }

  const subtotal = line_items.reduce((sum, item) => sum + item.total, 0)
  const effectiveSubtotal = venue_area ? Math.max(subtotal, venue_area.minimum_spend) : subtotal
  const tax_amount = calculateTax(effectiveSubtotal, settings.tax_rate)
  const total = effectiveSubtotal + tax_amount
  const deposit_amount = total * (settings.deposit_percentage / 100)
  const balance_amount = total - deposit_amount

  return {
    line_items,
    subtotal: effectiveSubtotal,
    tax_rate: settings.tax_rate,
    tax_amount,
    total,
    deposit_percentage: settings.deposit_percentage,
    deposit_amount,
    balance_amount,
  }
}

function formatPrice(amount: number): string {
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Persist a quotation (quote + line items) to the database.
 * Called when the customer accepts the quotation.
 */
export async function persistQuotation(
  bookingId: string,
  calculation: CalculationResult,
  quoteNumber: string,
  validityDays: number
): Promise<string | null> {
  const now = new Date()
  const validUntil = new Date(now)
  validUntil.setDate(validUntil.getDate() + validityDays)

  const { data, error } = await (await getAdminClient())
    .from('quotes')
    .insert({
      booking_id: bookingId,
      quote_number: quoteNumber,
      status: 'draft',
      subtotal: calculation.subtotal,
      tax_rate: calculation.tax_rate,
      tax_amount: calculation.tax_amount,
      total: calculation.total,
      deposit_percentage: calculation.deposit_percentage,
      deposit_amount: calculation.deposit_amount,
      balance_amount: calculation.balance_amount,
      validity_days: validityDays,
      valid_until: validUntil.toISOString().split('T')[0],
    })
    .select('id')
    .single()

  if (error || !data) return null

  const quoteId = data.id

  // Insert line items
  const items = calculation.line_items.map((item, index) => ({
    quote_id: quoteId,
    item_type: item.item_type,
    reference_id: item.reference_id,
    label: item.label,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.total,
    sort_order: item.sort_order || index,
  }))

  const { error: itemsError } = await (await getAdminClient())
    .from('quote_items')
    .insert(items)

  if (itemsError) return null

  return quoteId
}