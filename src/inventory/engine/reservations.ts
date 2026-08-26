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
  const { data, error } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Failed to load reservation: ${error.message}`)
  return data as InventoryReservation | null
}

export async function getReservationsForBooking(bookingId: string): Promise<InventoryReservation[]> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_reservations')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to load reservations: ${error.message}`)
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

  const { data: existing, error: existingError } = await supabase
    .from('inventory_reservations')
    .select('status')
    .eq('id', id)
    .maybeSingle()

  if (existingError) throw new Error(`Failed to load reservation: ${existingError.message}`)
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

  try {
    await createTransaction({
      product_id: reservation.product_id,
      location_id: reservation.location_id,
      transaction_type: 'sale',
      quantity: remaining,
      reference_type: 'booking',
      reference_id: reservation.booking_id,
      notes: `Consumed from reservation ${reservation.id}`,
      reservation_id: reservation.id,
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
      // H2: this reservation's SALE already exists — a concurrent consume
      // won the insert, or a retry after a crash between createTransaction
      // and the status update below. Reuse the posted txn (unique index
      // 077 guarantees at most one per reservation); never post a second.
      const { data: existing } = await supabase
        .from('inventory_transactions')
        .select('id')
        .eq('reservation_id', reservation.id)
        .eq('transaction_type', 'sale')
        .maybeSingle()
      if (!existing) throw error
    } else {
      throw error
    }
  }

  // Guarded update: only transitions from active/partially_consumed. If it
  // affects zero rows, another request consumed (or cancelled) this
  // reservation between our read and this write. Already-consumed is
  // treated as an idempotent success so a re-invocation after a crash never
  // errors the batch loop; anything else is a hard error.
  const { data, error } = await supabase
    .from('inventory_reservations')
    .update({
      quantity_consumed: reservation.quantity_reserved,
      status: 'consumed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['active', 'partially_consumed'])
    .select()
    .maybeSingle()

  if (error) throw new Error(`Failed to consume reservation: ${error.message}`)

  if (!data) {
    const current = await getReservation(id)
    if (!current) throw new Error(`Reservation not found: ${id}`)
    if (current.status === 'consumed') return current
    throw new Error(`Cannot consume a reservation in status ${current.status}`)
  }

  return data as InventoryReservation
}

export async function consumeReservationsForBooking(bookingId: string): Promise<number> {
  const active = await getReservationsForBooking(bookingId)
  const toConsume = active.filter(r => r.status === 'active' || r.status === 'partially_consumed')

  if (toConsume.length === 0) return 0

  let consumed = 0
  for (const r of toConsume) {
    await consumeReservation(r.id)
    consumed++
  }
  return consumed
}

export type ReservationLifecycleAction = 'reserve' | 'cancel' | 'consume'

export interface ReservationLifecycleResult {
  action: ReservationLifecycleAction
  booking_id: string
  expected: number
  processed: number
  failed: number
  failures: Array<{ reservation_id: string | null; message: string }>
}

export class ReservationLifecycleError extends Error {
  readonly details: ReservationLifecycleResult

  constructor(details: ReservationLifecycleResult) {
    super(
      `Reservation lifecycle ${details.action} incomplete for booking ${details.booking_id}: ` +
      `${details.processed}/${details.expected} processed, ${details.failed} failed`,
    )
    this.name = 'ReservationLifecycleError'
    this.details = details
  }
}

async function getExpectedBookingReservations(bookingId: string): Promise<CreateReservationInput[]> {
  const supabase = getInventoryClient()

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, venue_area_id, adults, guests')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    throw new Error(`Booking not found: ${bookingId}`)
  }

  const headCount = booking.adults ?? booking.guests ?? 0
  if (headCount <= 0) return []

  const { data: defaultLocation, error: locationError } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (locationError) throw new Error(`Failed to resolve reservation location: ${locationError.message}`)
  if (!defaultLocation?.id) throw new Error('No active inventory location is available for reservations')

  const { data: bookingQuote, error: quoteError } = await supabase
    .from('bookings')
    .select('quote_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (quoteError) throw new Error(`Failed to load booking quote: ${quoteError.message}`)
  if (!bookingQuote?.quote_id) return []

  const { data: quoteItems, error: quoteItemsError } = await supabase
    .from('quote_items')
    .select('reference_id, quantity')
    .eq('item_type', 'drink_package')
    .eq('quote_id', bookingQuote.quote_id)

  if (quoteItemsError) throw new Error(`Failed to load booking drink packages: ${quoteItemsError.message}`)
  if (!quoteItems || quoteItems.length === 0) return []

  const expected = new Map<string, CreateReservationInput>()
  for (const item of quoteItems) {
    const packageId = item.reference_id
    if (!packageId) continue

    const { data: products, error: productsError } = await supabase
      .from('drink_package_products')
      .select('product_id, quantity_per_person')
      .eq('drink_package_id', packageId)

    if (productsError) {
      throw new Error(`Failed to load drink package ${packageId}: ${productsError.message}`)
    }

    for (const product of products ?? []) {
      const key = `${product.product_id}:${defaultLocation.id}`
      const quantity = Number(product.quantity_per_person) * Number(headCount)
      const existing = expected.get(key)
      expected.set(key, {
        booking_id: bookingId,
        product_id: product.product_id,
        location_id: defaultLocation.id,
        quantity: (existing?.quantity ?? 0) + quantity,
        notes: existing?.notes
          ? `${existing.notes}; ${packageId}`
          : `Auto-reserved from drink package ${packageId}`,
      })
    }
  }

  return [...expected.values()]
}

async function createOrReuseReservation(input: CreateReservationInput): Promise<InventoryReservation> {
  try {
    return await createReservation(input)
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Reservation already exists')) throw error

    const existing = (await getReservationsForBooking(input.booking_id)).find(
      reservation => reservation.product_id === input.product_id && reservation.location_id === input.location_id,
    )
    if (!existing) throw error
    if (existing.status === 'cancelled') {
      throw new Error(`Reservation ${existing.id} is cancelled and cannot be recreated`)
    }
    return existing
  }
}

function lifecycleResult(
  bookingId: string,
  action: ReservationLifecycleAction,
  expected: number,
  processed: number,
  failures: ReservationLifecycleResult['failures'],
): ReservationLifecycleResult {
  return {
    action,
    booking_id: bookingId,
    expected,
    processed,
    failed: failures.length,
    failures,
  }
}

function assertLifecycleStatus(
  bookingId: string,
  action: ReservationLifecycleAction,
  status: string,
): void {
  const accepted: Record<ReservationLifecycleAction, string[]> = {
    reserve: ['confirmed', 'in_progress', 'completed'],
    cancel: ['cancelled', 'refunded'],
    consume: ['completed'],
  }
  if (accepted[action].includes(status)) return

  throw new ReservationLifecycleError(lifecycleResult(bookingId, action, 1, 0, [{
    reservation_id: null,
    message: `Booking status is ${status}; expected ${accepted[action].join(' or ')}`,
  }]))
}

export async function processReservationLifecycle(
  bookingId: string,
  action: ReservationLifecycleAction,
): Promise<ReservationLifecycleResult> {
  const supabase = getInventoryClient()
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) throw new Error(`Failed to load booking status: ${bookingError.message}`)
  if (!booking) throw new Error(`Booking not found: ${bookingId}`)
  assertLifecycleStatus(bookingId, action, booking.status)

  if (action === 'reserve') {
    const expectedInputs = await getExpectedBookingReservations(bookingId)
    const failures: ReservationLifecycleResult['failures'] = []
    let processed = 0

    for (const input of expectedInputs) {
      try {
        await createOrReuseReservation(input)
        processed++
      } catch (error) {
        failures.push({
          reservation_id: null,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const result = lifecycleResult(bookingId, action, expectedInputs.length, processed, failures)
    if (failures.length > 0) throw new ReservationLifecycleError(result)
    return result
  }

  let preparationFailures: ReservationLifecycleResult['failures'] = []
  if (action === 'consume') {
    const expectedInputs = await getExpectedBookingReservations(bookingId)
    for (const input of expectedInputs) {
      try {
        await createOrReuseReservation(input)
      } catch (error) {
        preparationFailures.push({
          reservation_id: null,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }

  const reservations = await getReservationsForBooking(bookingId)
  const relevant = action === 'cancel'
    ? reservations
    : reservations.filter(reservation => reservation.status !== 'cancelled')
  const failures: ReservationLifecycleResult['failures'] = [...preparationFailures]
  let processed = 0

  for (const reservation of relevant) {
    try {
      if (action === 'cancel') {
        if (reservation.status === 'cancelled') {
          processed++
          continue
        }
        await cancelReservation(reservation.id)
      } else {
        if (reservation.status === 'consumed') {
          processed++
          continue
        }
        await consumeReservation(reservation.id)
      }
      processed++
    } catch (error) {
      const current = await getReservation(reservation.id)
      const reachedTarget = action === 'cancel'
        ? current?.status === 'cancelled'
        : current?.status === 'consumed'
      if (reachedTarget) {
        processed++
        continue
      }
      failures.push({
        reservation_id: reservation.id,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const result = lifecycleResult(
    bookingId,
    action,
    relevant.length + preparationFailures.length,
    processed,
    failures,
  )
  if (failures.length > 0) throw new ReservationLifecycleError(result)
  return result
}

export async function autoReserveForBooking(bookingId: string): Promise<InventoryReservation[]> {
  const expected = await getExpectedBookingReservations(bookingId)
  const created: InventoryReservation[] = []
  for (const input of expected) {
    created.push(await createOrReuseReservation(input))
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
