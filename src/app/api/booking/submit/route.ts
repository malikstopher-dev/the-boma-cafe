import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { bookingFormSchema, type BookingFormData } from '@/lib/booking/validation'
import { calculateQuotation, type CalculationResult } from '@/lib/booking/pricing'
import { generateAccessToken } from '@/lib/booking/quote-generator'
import { getBookingSettings } from '@/lib/booking/settings'

export const dynamic = 'force-dynamic'

type AtomicSubmissionResult = {
  booking_id: string
  quote_id: string
  quote_number: string
  job_id: string
  job_outcome: string
  job_payload: Record<string, unknown>
  duplicate: boolean
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!await checkRateLimit(`booking-submit:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const parsed = bookingFormSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: (parsed as { error: { flatten(): { fieldErrors: Record<string, string[]> } } }).error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = parsed.data as BookingFormData
    const settings = await getBookingSettings()

    if (!settings.enabled) {
      return NextResponse.json({ error: 'Online booking is currently disabled' }, { status: 503 })
    }

    // All work before the RPC is read-only. Pricing is authoritative on the
    // server; every durable mutation happens inside submit_booking_atomic().
    const calculation = await calculateQuotation({
      venue_area_id: data.venue_area_id,
      food_package_id: data.food_package_id || null,
      drink_package_id: data.drink_package_id || null,
      addons: (data.addons || []) as Array<{ id: string; quantity: number }>,
      adults: data.adults,
      children: data.children,
      booking_date: data.booking_date,
      duration_hours: data.duration_hours,
    })

    const client = await getAdminClient()
    let bookingTypeName = 'Event'
    let venueAreaName = 'Venue'
    let foodPackageName = 'None selected'
    let drinkPackageName = 'None selected'
    let addonNames: Array<{ name: string; qty: number }> = []

    try {
      const [btResult, vaResult, fpResult, dpResult, addonsResult] = await Promise.all([
        client.from('booking_types').select('name').eq('id', data.booking_type_id).maybeSingle(),
        client.from('venue_areas').select('name').eq('id', data.venue_area_id).maybeSingle(),
        data.food_package_id
          ? client.from('food_packages').select('name').eq('id', data.food_package_id).maybeSingle()
          : Promise.resolve(null),
        data.drink_package_id
          ? client.from('drink_packages').select('name').eq('id', data.drink_package_id).maybeSingle()
          : Promise.resolve(null),
        (data.addons || []).length > 0
          ? client.from('addons').select('id, name').in('id', (data.addons || []).map((addon) => addon.id))
          : Promise.resolve({ data: [] }),
      ])

      if (btResult?.data) bookingTypeName = btResult.data.name
      if (vaResult?.data) venueAreaName = vaResult.data.name
      if (fpResult?.data) foodPackageName = fpResult.data.name
      if (dpResult?.data) drinkPackageName = dpResult.data.name
      if (addonsResult?.data) {
        const addonMap = new Map<string, string>(
          addonsResult.data.map(
            (addon: { id: string; name: string }) => [addon.id, addon.name] as [string, string],
          ),
        )
        addonNames = (data.addons || []).map((addon) => ({
          name: addonMap.get(addon.id) || 'Unknown',
          qty: addon.quantity,
        }))
      }
    } catch {
      // Display labels are non-authoritative. Pricing and the database checks
      // remain authoritative if a name lookup is temporarily unavailable.
    }

    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + (settings.quote_validity_days || 7))
    const accessToken = generateAccessToken('pending')
    const jobPayload = {
      version: 1,
      customerName: data.name,
      customerEmail: data.email,
      customerPhone: data.phone,
      bookingType: bookingTypeName,
      venueArea: venueAreaName,
      foodPackage: foodPackageName,
      drinkPackage: drinkPackageName,
      addons: addonNames.map((addon) => `${addon.name} x ${addon.qty}`).join(', '),
      addonNames,
      bookingDate: data.booking_date,
      bookingTime: data.booking_time,
      guests: data.adults + data.children,
      lineItems: calculation.line_items.filter((item) => item.total > 0),
      subtotal: calculation.subtotal,
      taxRate: calculation.tax_rate,
      taxAmount: calculation.tax_amount,
      total: calculation.total,
      depositPercentage: calculation.deposit_percentage,
      depositAmount: calculation.deposit_amount,
      balanceAmount: calculation.balance_amount,
      validUntil: validUntil.toISOString().split('T')[0],
      notificationEmails: settings.notification_emails,
      company: data.company || null,
      specialRequests: data.special_requests || null,
    }

    const idempotencyKey = bookingIdempotencyKey(data)
    const { data: rpcData, error: rpcError } = await client.rpc('submit_booking_atomic', {
      p_booking: data,
      p_calculation: calculation,
      p_access_token: accessToken,
      p_valid_until: validUntil.toISOString().split('T')[0],
      p_job_payload: jobPayload,
      p_idempotency_key: idempotencyKey,
      p_portal_base_url: 'https://the-boma-cafe.vercel.app/booking',
    })

    if (rpcError || !rpcData) {
      const message = rpcError?.message || 'Atomic booking submission returned no result'
      if (message.includes('BOOKING_UNAVAILABLE') || message.includes('BOOKING_INVALID_AREA')) {
        return NextResponse.json({ error: availabilityMessage(message) }, { status: 409 })
      }
      if (message.includes('BOOKING_INVALID_INPUT')) {
        return NextResponse.json({ error: 'Invalid booking submission' }, { status: 400 })
      }
      console.error('Atomic booking submission failed:', message)
      return NextResponse.json({ error: 'Failed to submit booking' }, { status: 500 })
    }

    const result = rpcData as AtomicSubmissionResult
    const quotation = result.duplicate
      ? quotationFromJobPayload(result.job_payload, calculation)
      : calculation

    return NextResponse.json({
      success: true,
      booking_id: result.booking_id,
      quote_id: result.quote_id,
      quote_number: result.quote_number,
      quotation,
      job_id: result.job_id,
      ...(result.duplicate ? { duplicate: true } : {}),
    }, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    console.error('Submit booking error:', error)
    return NextResponse.json({ error: 'Failed to submit booking' }, { status: 500 })
  }
}

export function bookingIdempotencyKey(data: BookingFormData): string {
  const canonical = {
    ...data,
    email: data.email.trim().toLowerCase(),
    addons: [...(data.addons || [])]
      .sort((left, right) => left.id.localeCompare(right.id) || left.quantity - right.quantity),
  }
  const digest = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
  return `booking-submit:v2:${digest}`
}

function quotationFromJobPayload(
  payload: Record<string, unknown>,
  fallback: CalculationResult,
): CalculationResult {
  const numeric = (key: string, defaultValue: number) => {
    const value = Number(payload[key])
    return Number.isFinite(value) ? value : defaultValue
  }

  return {
    line_items: Array.isArray(payload.lineItems)
      ? payload.lineItems as CalculationResult['line_items']
      : fallback.line_items,
    subtotal: numeric('subtotal', fallback.subtotal),
    tax_rate: numeric('taxRate', fallback.tax_rate),
    tax_amount: numeric('taxAmount', fallback.tax_amount),
    total: numeric('total', fallback.total),
    deposit_percentage: numeric('depositPercentage', fallback.deposit_percentage),
    deposit_amount: numeric('depositAmount', fallback.deposit_amount),
    balance_amount: numeric('balanceAmount', fallback.balance_amount),
  }
}

function availabilityMessage(message: string): string {
  const detail = message.split(':').slice(1).join(':').trim()
  return detail || 'The selected venue area is no longer available'
}
