import { getAdminClient } from '@/lib/supabase'
import type { BlockedDate, AvailabilitySlot } from '@/types/booking'

export interface AvailabilityResult {
  is_available: boolean
  conflicts: string[]
  alternatives: Array<{
    venue_area_id: string
    name: string
    capacity_max: number
    is_available: boolean
  }>
}

export async function getBlockedDates(
  startDate: string,
  endDate?: string
): Promise<BlockedDate[]> {
  const query = (await getAdminClient())
    .from('blocked_dates')
    .select('*')
    .lte('start_date', endDate || startDate)

  if (endDate) {
    query.gte('end_date', startDate)
  } else {
    query.lte('start_date', startDate)
    query.gte('end_date', startDate)
  }

  const { data } = await query
  return (data || []) as BlockedDate[]
}

export async function isDateBlocked(
  date: string,
  venueAreaId?: string
): Promise<boolean> {
  const { data } = await (await getAdminClient())
    .from('blocked_dates')
    .select('id, venue_area_id')
    .lte('start_date', date)
    .gte('end_date', date)

  if (!data || data.length === 0) return false

  const blocked = data as Array<{ id: string; venue_area_id: string | null }>

  if (venueAreaId) {
    return blocked.some(d => d.venue_area_id === null || d.venue_area_id === venueAreaId)
  }

  return true
}

export async function getAvailableAreas(
  date: string,
  startTime: string,
  endTime: string,
  guestCount: number
): Promise<AvailabilitySlot[]> {
  const client = await getAdminClient()

  const [areasRes, blockedRes, bookedRes] = await Promise.all([
    client.from('venue_areas').select('*').eq('is_active', true).order('sort_order'),
    client.from('blocked_dates')
      .select('venue_area_id')
      .lte('start_date', date)
      .gte('end_date', date),
    client.from('availability')
      .select('venue_area_id')
      .eq('booking_date', date)
      .lte('start_time', endTime)
      .gte('end_time', startTime)
      .neq('status', 'cancelled'),
  ])

  const blockedAreaIds = new Set((blockedRes.data || []).map(b => b.venue_area_id))
  const bookedAreaIds = new Set((bookedRes.data || []).map(b => b.venue_area_id))

  const slots: AvailabilitySlot[] = (areasRes.data || []).map(area => ({
    venue_area_id: area.id,
    venue_area_name: area.name,
    date,
    start_time: startTime,
    end_time: endTime,
    is_available:
      !blockedAreaIds.has(area.id) &&
      !bookedAreaIds.has(area.id) &&
      guestCount >= area.capacity_min &&
      guestCount <= area.capacity_max,
    guest_count: guestCount,
    capacity_max: area.capacity_max,
  }))

  return slots
}

export async function checkAvailability(
  venueAreaId: string,
  date: string,
  startTime: string,
  endTime: string,
  guestCount: number,
  excludeBookingId?: string
): Promise<AvailabilityResult> {
  const client = await getAdminClient()
  const conflicts: string[] = []
  const alternatives: AvailabilityResult['alternatives'] = []

  // 1. Check blocked dates
  const { data: blockedDates } = await client
    .from('blocked_dates')
    .select('reason')
    .lte('start_date', date)
    .gte('end_date', date)
    .or(`venue_area_id.eq.${venueAreaId},venue_area_id.is.null`)

  if (blockedDates && blockedDates.length > 0) {
    conflicts.push(`Venue area is blocked on this date`)
  }

  // 2. Check existing bookings
  let bookedQuery = client
    .from('availability')
    .select('id, guest_count')
    .eq('venue_area_id', venueAreaId)
    .eq('booking_date', date)
    .lte('start_time', endTime)
    .gte('end_time', startTime)
    .neq('status', 'cancelled')

  if (excludeBookingId) {
    bookedQuery = bookedQuery.neq('booking_id', excludeBookingId)
  }

  const { data: existingBookings } = await bookedQuery

  if (existingBookings && existingBookings.length > 0) {
    conflicts.push(`Venue area is already booked during this time`)
  }

  // 3. Check capacity
  const { data: venueArea } = await client
    .from('venue_areas')
    .select('*')
    .eq('id', venueAreaId)
    .single()

  if (venueArea) {
    if (guestCount < venueArea.capacity_min) {
      conflicts.push(`Minimum ${venueArea.capacity_min} guests required for ${venueArea.name}`)
    }
    if (guestCount > venueArea.capacity_max) {
      conflicts.push(`Maximum ${venueArea.capacity_max} guests allowed for ${venueArea.name}`)
    }

    // 4. Suggest alternatives if unavailable
    if (conflicts.length > 0) {
      const { data: allAreas } = await client
        .from('venue_areas')
        .select('*')
        .eq('is_active', true)
        .neq('id', venueAreaId)
        .order('sort_order')

      for (const area of allAreas || []) {
const blockedDatesData = (blockedDates || []) as Array<{ venue_area_id: string | null; reason: string | null }>
    const areaBlocked = blockedDatesData.some(b =>
      b.venue_area_id === null || b.venue_area_id === area.id
    )
        const areaBooked = existingBookings && existingBookings.length > 0
        alternatives.push({
          venue_area_id: area.id,
          name: area.name,
          capacity_max: area.capacity_max,
          is_available: !areaBlocked && !areaBooked &&
            guestCount >= area.capacity_min &&
            guestCount <= area.capacity_max,
        })
      }
    }
  }

  return {
    is_available: conflicts.length === 0,
    conflicts,
    alternatives,
  }
}

/**
 * Record a booking in the availability table (called when booking is confirmed).
 */
export async function recordAvailability(
  venueAreaId: string,
  bookingId: string,
  date: string,
  startTime: string,
  endTime: string,
  guestCount: number,
  status: 'booked' | 'tentative' = 'tentative'
): Promise<boolean> {
  const { error } = await (await getAdminClient())
    .from('availability')
    .insert({
      venue_area_id: venueAreaId,
      booking_id: bookingId,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      guest_count: guestCount,
      status,
    })
  return !error
}

/**
 * Release availability (when booking is cancelled).
 */
export async function releaseAvailability(bookingId: string): Promise<boolean> {
  const { error } = await (await getAdminClient())
    .from('availability')
    .update({ status: 'cancelled' })
    .eq('booking_id', bookingId)
  return !error
}