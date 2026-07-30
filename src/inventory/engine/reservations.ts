import type { InventoryReservation, CreateReservationInput, DrinkPackageProduct } from './types'
import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'

export async function createReservation(input: CreateReservationInput): Promise<InventoryReservation> {
  const supabase = getInventoryClient()

  const { data, error } = await supabase
    .from('inventory_reservations')
    .insert({
      booking_id: input.booking_id,
      product_id: input.product_id,
      location_id: input.location_id,
      quantity_reserved: input.quantity,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Reservation already exists for this booking/product/location`)
    }
    throw new Error(`Failed to create reservation: ${error.message}`)
  }

  return data as InventoryReservation
}

export async function getReservation(id: string): Promise<InventoryReservation | null> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  return data as InventoryReservation | null
}

export async function getReservationsForBooking(bookingId: string): Promise<InventoryReservation[]> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
  return (data ?? []) as InventoryReservation[]
}

export async function getReservationsForProduct(
  productId: string,
  locationId: string,
): Promise<InventoryReservation[]> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .in('status', ['active', 'partially_consumed'])
    .order('created_at', { ascending: false })
  return (data ?? []) as InventoryReservation[]
}

export async function getTotalReserved(productId: string, locationId: string): Promise<number> {
  const reservations = await getReservationsForProduct(productId, locationId)
  return reservations.reduce((sum, r) => sum + (r.quantity_reserved - r.quantity_consumed), 0)
}

export async function cancelReservation(id: string): Promise<InventoryReservation> {
  const supabase = getInventoryClient()

  const { data: existing } = await supabase
    .from('inventory_reservations')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (!existing) throw new Error(`Reservation not found: ${id}`)
  if (existing.status === 'consumed') throw new Error(`Cannot cancel a consumed reservation`)
  if (existing.status === 'cancelled') throw new Error(`Reservation is already cancelled`)

  const { data, error } = await supabase
    .from('inventory_reservations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel reservation: ${error.message}`)
  return data as InventoryReservation
}

export async function cancelReservationsForBooking(bookingId: string): Promise<number> {
  const supabase = getInventoryClient()

  const active = await getReservationsForBooking(bookingId)
  const toCancel = active.filter(r => r.status === 'active' || r.status === 'partially_consumed')

  if (toCancel.length === 0) return 0

  const ids = toCancel.map(r => r.id)
  const { error } = await supabase
    .from('inventory_reservations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)
    .in('status', ['active', 'partially_consumed'])

  if (error) throw new Error(`Failed to cancel reservations: ${error.message}`)
  return ids.length
}

export async function consumeReservation(id: string): Promise<InventoryReservation> {
  const supabase = getInventoryClient()

  const reservation = await getReservation(id)
  if (!reservation) throw new Error(`Reservation not found: ${id}`)
  if (reservation.status === 'consumed') throw new Error(`Reservation is already consumed`)
  if (reservation.status === 'cancelled') throw new Error(`Cannot consume a cancelled reservation`)

  const remaining = reservation.quantity_reserved - reservation.quantity_consumed
  if (remaining <= 0) throw new Error(`Reservation has no remaining quantity to consume`)

  await createTransaction({
    product_id: reservation.product_id,
    location_id: reservation.location_id,
    transaction_type: 'sale',
    quantity: remaining,
    reference_type: 'booking',
    reference_id: reservation.booking_id,
    notes: `Consumed from reservation ${reservation.id}`,
  })

  const { data, error } = await supabase
    .from('inventory_reservations')
    .update({
      quantity_consumed: reservation.quantity_reserved,
      status: 'consumed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to consume reservation: ${error.message}`)
  return data as InventoryReservation
}

export async function consumeReservationsForBooking(bookingId: string): Promise<number> {
  const active = await getReservationsForBooking(bookingId)
  const toConsume = active.filter(r => r.status === 'active' || r.status === 'partially_consumed')

  if (toConsume.length === 0) return 0

  let consumed = 0
  for (const r of toConsume) {
    try {
      await consumeReservation(r.id)
      consumed++
    } catch {
      continue
    }
  }
  return consumed
}

export async function autoReserveForBooking(bookingId: string): Promise<InventoryReservation[]> {
  const supabase = getInventoryClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, venue_area_id, adults, guests')
    .eq('id', bookingId)
    .single()

  if (!booking) throw new Error(`Booking not found: ${bookingId}`)

  const headCount = booking.adults ?? booking.guests ?? 0
  if (headCount <= 0) return []

  const { data: defaultLocation } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const locationId = defaultLocation?.id
  if (!locationId) return []

  const { data: bookingQuote } = await supabase
    .from('bookings')
    .select('quote_id')
    .eq('id', bookingId)
    .maybeSingle()

  const quoteId = bookingQuote?.quote_id
  if (!quoteId) return []

  const { data: quoteItems } = await supabase
    .from('quote_items')
    .select('reference_id, quantity')
    .eq('item_type', 'drink_package')
    .eq('quote_id', quoteId)

  if (!quoteItems || quoteItems.length === 0) return []

  const created: InventoryReservation[] = []
  for (const item of quoteItems) {
    const packageId = item.reference_id
    if (!packageId) continue

    const { data: products } = await supabase
      .from('drink_package_products')
      .select('product_id, quantity_per_person')
      .eq('drink_package_id', packageId)

    if (!products) continue

    for (const p of products) {
      const totalQuantity = p.quantity_per_person * headCount
      try {
        const reservation = await createReservation({
          booking_id: bookingId,
          product_id: p.product_id,
          location_id: locationId,
          quantity: totalQuantity,
          notes: `Auto-reserved from drink package ${packageId}`,
        })
        created.push(reservation)
      } catch {
        continue
      }
    }
  }

  return created
}

export async function getDrinkPackageProducts(packageId: string): Promise<DrinkPackageProduct[]> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('drink_package_products')
    .select('*, inventory_products!inner(name, sku)')
    .eq('drink_package_id', packageId)
    .order('created_at', { ascending: true })
  return (data ?? []) as unknown as DrinkPackageProduct[]
}

export async function getAllDrinkPackageProducts(): Promise<(DrinkPackageProduct & { package_name?: string; product_name?: string })[]> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('drink_package_products')
    .select('*, drink_packages!inner(name), inventory_products!inner(name)')
    .order('drink_package_id', { ascending: true })
  return (data ?? []) as unknown as (DrinkPackageProduct & { package_name?: string; product_name?: string })[]
}

export async function addDrinkPackageProduct(
  drinkPackageId: string,
  productId: string,
  quantityPerPerson: number,
): Promise<DrinkPackageProduct> {
  const supabase = getInventoryClient()

  const { data, error } = await supabase
    .from('drink_package_products')
    .insert({
      drink_package_id: drinkPackageId,
      product_id: productId,
      quantity_per_person: quantityPerPerson,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Product already added to this drink package`)
    }
    throw new Error(`Failed to add product: ${error.message}`)
  }

  return data as DrinkPackageProduct
}

export async function removeDrinkPackageProduct(id: string): Promise<void> {
  const supabase = getInventoryClient()
  const { error } = await supabase
    .from('drink_package_products')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to remove product: ${error.message}`)
}
