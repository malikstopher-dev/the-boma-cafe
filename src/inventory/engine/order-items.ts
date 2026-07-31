import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'
import type { OrderItem, OrderItemDetail, ParsedOrderItem } from './types'

export function parseOrderItemsJson(itemsJson: string | null): ParsedOrderItem[] {
  if (!itemsJson) return []
  try {
    const parsed = JSON.parse(itemsJson)
    const items = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(items)) return []
    return items
      .map((i: Record<string, unknown>) => ({
        name: String(i.name ?? '').trim(),
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.price) || 0,
        selected_size: i.selected_size ? String(i.selected_size) : null,
        notes: i.notes ? String(i.notes) : null,
      }))
      .filter(i => i.name.length > 0)
  } catch {
    return []
  }
}

export async function getOrder(orderId: string): Promise<{ id: string; items_json: string | null; status: string } | null> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('orders')
    .select('id, items_json, status')
    .eq('id', orderId)
    .maybeSingle()
  return data as { id: string; items_json: string | null; status: string } | null
}

interface MatchResult {
  product_id: string | null
  pour_size_ml: number | null
  base_quantity: number | null
}

async function matchItemToProduct(itemName: string, quantity: number): Promise<MatchResult> {
  const supabase = getInventoryClient()

  const { data: barItem } = await supabase
    .from('bar_items')
    .select('id, name, bar_item_inventory_links!inner(inventory_product_id, pour_size_ml)')
    .ilike('name', itemName)
    .limit(1)
    .maybeSingle()

  const link = barItem?.bar_item_inventory_links?.[0]

  if (barItem && link) {
    return computeBaseQuantity({
      product_id: link.inventory_product_id,
      pour_size_ml: Number(link.pour_size_ml),
      quantity,
    })
  }

  if (barItem) {
    const { data: product } = await supabase
      .from('inventory_products')
      .select('id')
      .ilike('name', itemName)
      .limit(1)
      .maybeSingle()
    return product
      ? computeBaseQuantity({ product_id: product.id, pour_size_ml: null, quantity })
      : { product_id: null, pour_size_ml: null, base_quantity: null }
  }

  const { data: productByName } = await supabase
    .from('inventory_products')
    .select('id')
    .ilike('name', itemName)
    .limit(1)
    .maybeSingle()

  return productByName
    ? computeBaseQuantity({ product_id: productByName.id, pour_size_ml: null, quantity })
    : { product_id: null, pour_size_ml: null, base_quantity: null }
}

async function computeBaseQuantity(input: {
  product_id: string
  pour_size_ml: number | null
  quantity: number
}): Promise<MatchResult> {
  const supabase = getInventoryClient()
  const { product_id, pour_size_ml, quantity } = input

  if (!pour_size_ml || pour_size_ml <= 0) {
    return { product_id, pour_size_ml, base_quantity: quantity }
  }

  const { data: baseUom } = await supabase
    .from('inventory_product_uoms')
    .select('uom_id')
    .eq('product_id', product_id)
    .eq('is_base', true)
    .single()

  if (!baseUom) {
    return { product_id, pour_size_ml, base_quantity: quantity }
  }

  const { data: uom } = await supabase
    .from('inventory_uoms')
    .select('name')
    .eq('id', baseUom.uom_id)
    .maybeSingle()

  const baseUomName = (uom?.name ?? '').toLowerCase()
  if (['litre', 'liter', 'litres', 'liters', 'l', 'lt'].includes(baseUomName)) {
    return { product_id, pour_size_ml, base_quantity: (quantity * pour_size_ml) / 1000 }
  }

  return { product_id, pour_size_ml, base_quantity: quantity }
}

export async function syncOrderItems(orderId: string): Promise<OrderItemDetail> {
  const supabase = getInventoryClient()

  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)

  const parsed = parseOrderItemsJson(order.items_json)

  for (const item of parsed) {
    const match = await matchItemToProduct(item.name, item.quantity)

    const existing = await supabase
      .from('order_items')
      .select('id, transaction_id')
      .eq('order_id', orderId)
      .eq('item_name', item.name)
      .maybeSingle()

    if (existing.data) {
      if (existing.data.transaction_id) continue
      await supabase
        .from('order_items')
        .update({
          quantity: item.quantity,
          unit_price: item.unit_price,
          selected_size: item.selected_size,
          notes: item.notes,
          product_id: match.product_id,
          pour_size_ml: match.pour_size_ml,
          base_quantity: match.base_quantity,
          matched_at: match.product_id ? new Date().toISOString() : null,
        })
        .eq('id', existing.data.id)
    } else {
      await supabase.from('order_items').insert({
        order_id: orderId,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_size: item.selected_size,
        notes: item.notes,
        product_id: match.product_id,
        pour_size_ml: match.pour_size_ml,
        base_quantity: match.base_quantity,
        matched_at: match.product_id ? new Date().toISOString() : null,
      })
    }
  }

  return listOrderItems(orderId)
}

export async function deductOrderItems(orderId: string, locationId: string): Promise<{ deducted: number; skipped: number }> {
  const supabase = getInventoryClient()

  const { data: lines } = await supabase
    .from('order_items')
    .select('id, product_id, base_quantity, item_name, transaction_id, quantity')
    .eq('order_id', orderId)
    .is('transaction_id', null)

  const pending = (lines ?? []).filter(
    (l: { product_id: string | null; base_quantity: number | null }) =>
      l.product_id !== null && l.base_quantity !== null && l.base_quantity > 0,
  )

  let deducted = 0
  const skipped = (lines ?? []).length - pending.length

  for (const line of pending) {
    const transaction = await createTransaction({
      product_id: line.product_id as string,
      location_id: locationId,
      transaction_type: 'sale',
      quantity: -(line.base_quantity as number),
      reason_type: 'SALE',
      reference_type: 'pos_order',
      reference_id: orderId,
      notes: `Auto-deducted order item: ${line.item_name} (x${line.quantity})`,
    })

    await supabase
      .from('order_items')
      .update({
        transaction_id: transaction.id,
        deducted_at: new Date().toISOString(),
      })
      .eq('id', line.id)

    deducted++
  }

  return { deducted, skipped }
}

export async function listOrderItems(orderId: string): Promise<OrderItemDetail> {
  const supabase = getInventoryClient()
  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)

  const { data } = await supabase
    .from('order_items')
    .select('*, inventory_products(id, name, sku)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  return {
    order_id: orderId,
    status: order.status,
    items: (data ?? []) as unknown as OrderItem[],
  }
}

export async function autoDeductCompletedOrder(orderId: string): Promise<{ deducted: number; skipped: number }> {
  const supabase = getInventoryClient()

  const { data: location } = await supabase
    .from('inventory_locations')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!location) return { deducted: 0, skipped: 0 }

  await syncOrderItems(orderId)
  return deductOrderItems(orderId, location.id)
}
