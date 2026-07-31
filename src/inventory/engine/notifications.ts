import { getInventoryClient } from '../lib/db'
import type { InventoryAlertType, InventoryNotification, InventoryType, LowStockAlertResult } from './types'

export const ALERT_USER = 'admin'

interface LowProduct {
  productId: string
  name: string
  inventoryType: string
  balance: number
  threshold: number
  urgency: 'low' | 'out'
}

export async function generateLowStockAlerts(
  locationId: string,
  inventoryType?: InventoryType,
): Promise<LowStockAlertResult> {
  const supabase = getInventoryClient()

  let productsQuery = supabase
    .from('inventory_products')
    .select('id, name, inventory_type, reorder_threshold')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (inventoryType) {
    productsQuery = productsQuery.eq('inventory_type', inventoryType)
  }

  const { data: products } = await productsQuery

  const { data: balances } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)

  const balanceMap = new Map<string, number>()
  for (const b of (balances ?? []) as { product_id: string; balance: number }[]) {
    balanceMap.set(b.product_id, Number(b.balance))
  }

  const { data: rules } = await supabase
    .from('inventory_reorder_rules')
    .select('product_id, min_level')
    .eq('location_id', locationId)

  const ruleThreshold = new Map<string, number>()
  for (const r of (rules ?? []) as { product_id: string; min_level: number }[]) {
    ruleThreshold.set(r.product_id, Number(r.min_level ?? 0))
  }

  const low: LowProduct[] = []
  for (const p of (products ?? []) as { id: string; name: string; inventory_type: string; reorder_threshold: number | null }[]) {
    const balance = balanceMap.get(p.id) ?? 0
    const threshold = p.reorder_threshold ?? ruleThreshold.get(p.id) ?? 0
    if (balance <= 0) {
      low.push({ productId: p.id, name: p.name, inventoryType: p.inventory_type, balance, threshold, urgency: 'out' })
    } else if (threshold > 0 && balance <= threshold) {
      low.push({ productId: p.id, name: p.name, inventoryType: p.inventory_type, balance, threshold, urgency: 'low' })
    }
  }

  const { data: existing } = await supabase
    .from('staff_notifications')
    .select('id, type, metadata')
    .eq('user_id', ALERT_USER)
    .eq('read', false)
    .in('type', ['inventory_low_stock', 'inventory_out_of_stock'])

  const activeKeys = new Set(low.map(p => `${p.urgency === 'out' ? 'inventory_out_of_stock' : 'inventory_low_stock'}:${p.productId}`))
  const seenKeys = new Set<string>()
  let resolved = 0
  let created = 0

  for (const n of (existing ?? []) as { id: string; type: string; metadata: Record<string, unknown> }[]) {
    const productId = String(n.metadata?.product_id ?? '')
    const key = `${n.type}:${productId}`
    seenKeys.add(key)
    if (!activeKeys.has(key)) {
      await supabase.from('staff_notifications').update({ read: true }).eq('id', n.id)
      resolved += 1
    }
  }

  const toInsert: Array<{
    user_id: string
    type: InventoryAlertType
    title: string
    message: string
    metadata: Record<string, unknown>
  }> = []

  for (const p of low) {
    const key = `${p.urgency === 'out' ? 'inventory_out_of_stock' : 'inventory_low_stock'}:${p.productId}`
    if (seenKeys.has(key)) continue
    toInsert.push({
      user_id: ALERT_USER,
      type: p.urgency === 'out' ? 'inventory_out_of_stock' : 'inventory_low_stock',
      title: p.urgency === 'out' ? `${p.name} is out of stock` : `${p.name} is below reorder level`,
      message: `Current balance ${p.balance.toFixed(2)} (threshold ${p.threshold.toFixed(2)}) at location ${locationId}`,
      metadata: {
        product_id: p.productId,
        product_name: p.name,
        inventory_type: p.inventoryType,
        location_id: locationId,
        balance: p.balance,
        threshold: p.threshold,
        urgency: p.urgency,
      },
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('staff_notifications').insert(toInsert)
    if (!error) created = toInsert.length
  }

  return { created, resolved }
}

export async function listNotifications(
  userId: string,
  locationId?: string,
  unreadOnly = false,
  limit = 100,
): Promise<InventoryNotification[]> {
  const supabase = getInventoryClient()
  let query = supabase
    .from('staff_notifications')
    .select('id, user_id, type, title, message, read, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (unreadOnly) query = query.eq('read', false)
  if (locationId) query = query.eq('metadata->>location_id', locationId)

  const { data } = await query

  return ((data ?? []) as Array<{
    id: string
    user_id: string
    type: string
    title: string
    message: string | null
    read: boolean
    metadata: Record<string, unknown> | null
    created_at: string
  }>).map(n => ({
    id: n.id,
    userId: n.user_id,
    type: n.type as InventoryAlertType,
    title: n.title,
    message: n.message,
    read: n.read,
    metadata: n.metadata ?? {},
    createdAt: n.created_at,
  }))
}

export async function getUnreadNotificationCount(userId: string, locationId?: string): Promise<number> {
  const supabase = getInventoryClient()
  let query = supabase
    .from('staff_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (locationId) query = query.eq('metadata->>location_id', locationId)

  const { count } = await query
  return count ?? 0
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<boolean> {
  const supabase = getInventoryClient()
  const { error } = await supabase
    .from('staff_notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .eq('user_id', userId)
  return !error
}

export async function markAllNotificationsRead(userId: string, locationId?: string): Promise<boolean> {
  const supabase = getInventoryClient()
  let query = supabase
    .from('staff_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)

  if (locationId) query = query.eq('metadata->>location_id', locationId)

  const { error } = await query
  return !error
}
