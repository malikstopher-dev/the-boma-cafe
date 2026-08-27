import { getInventoryClient } from '../lib/db'
import type { OrderItem, OrderItemDetail, ParsedOrderItem } from './types'
import { resolveOrderStationLocation } from '../lib/station-location'

type OrderForDeduction = {
  id: string
  items_json: string | null
  status: string
  station: string | null
}

export function parseOrderItemsJson(itemsJson: string | null): ParsedOrderItem[] {
  if (!itemsJson) return []
  try {
    const parsed = JSON.parse(itemsJson)
    const items = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(items)) return []
    return items
      .map((i: Record<string, unknown>, index: number) => ({
        source_line_id: String(i.source_line_id ?? `legacy:${index}`),
        source_type: (i.source_type === 'bar_item' || i.source_type === 'menu_item'
          ? i.source_type
          : 'legacy') as ParsedOrderItem['source_type'],
        source_item_id: i.source_item_id ? String(i.source_item_id) : null,
        inventory_required: i.inventory_required === true,
        name: String(i.name ?? '').trim(),
        quantity: Number(i.quantity) || 1,
        unit_price: Number(i.price) || 0,
        selected_size: typeof i.selected_size === 'string'
          ? i.selected_size
          : i.selected_size && typeof i.selected_size === 'object' && 'name' in i.selected_size
            ? String((i.selected_size as { name: unknown }).name)
            : null,
        notes: i.notes ? String(i.notes) : null,
      }))
      .filter(i => i.name.length > 0)
  } catch {
    return []
  }
}

export async function getOrder(orderId: string): Promise<OrderForDeduction | null> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, items_json, status, station')
    .eq('id', orderId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load order: ${error.message}`)
  return data as OrderForDeduction | null
}

interface MatchResult {
  product_id: string | null
  pour_size_ml: number | null
  base_quantity: number | null
}

async function findUniqueProductByName(name: string): Promise<string | null> {
  const { data, error } = await getInventoryClient()
    .from('inventory_products')
    .select('id')
    .ilike('name', name)
    .limit(2)

  if (error) throw new Error(`Failed to match inventory product: ${error.message}`)
  return data?.length === 1 ? data[0]!.id : null
}

async function matchItemToProduct(item: ParsedOrderItem): Promise<MatchResult> {
  const supabase = getInventoryClient()

  if (item.source_type === 'bar_item' && item.source_item_id) {
    const { data: exactBarItem, error } = await supabase
      .from('bar_items')
      .select('id, bar_item_inventory_links(inventory_product_id, pour_size_ml)')
      .eq('id', item.source_item_id)
      .maybeSingle()
    if (error) throw new Error(`Failed to resolve bar inventory link: ${error.message}`)
    const exactLink = exactBarItem?.bar_item_inventory_links?.[0]
    if (exactLink) {
      return computeBaseQuantity({
        product_id: exactLink.inventory_product_id,
        pour_size_ml: Number(exactLink.pour_size_ml),
        quantity: item.quantity,
      })
    }
  }

  const { data: barItem, error: barError } = item.source_type === 'menu_item'
    ? { data: null, error: null }
    : await supabase
      .from('bar_items')
      .select('id, name, bar_item_inventory_links!inner(inventory_product_id, pour_size_ml)')
      .ilike('name', item.name)
      .limit(1)
      .maybeSingle()

  if (barError) throw new Error(`Failed to match bar order item: ${barError.message}`)
  const link = barItem?.bar_item_inventory_links?.[0]

  if (barItem && link) {
    return computeBaseQuantity({
      product_id: link.inventory_product_id,
      pour_size_ml: Number(link.pour_size_ml),
      quantity: item.quantity,
    })
  }

  if (barItem) {
    const productId = await findUniqueProductByName(item.name)
    return productId
      ? computeBaseQuantity({ product_id: productId, pour_size_ml: null, quantity: item.quantity })
      : { product_id: null, pour_size_ml: null, base_quantity: null }
  }

  const productId = await findUniqueProductByName(item.name)

  return productId
    ? computeBaseQuantity({ product_id: productId, pour_size_ml: null, quantity: item.quantity })
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

  const { data: baseUom, error: baseUomError } = await supabase
    .from('inventory_product_uoms')
    .select('uom_id')
    .eq('product_id', product_id)
    .eq('is_base', true)
    .maybeSingle()

  if (baseUomError) throw new Error(`Failed to load product base UOM: ${baseUomError.message}`)

  if (!baseUom) {
    return { product_id, pour_size_ml, base_quantity: quantity }
  }

  const { data: uom, error: uomError } = await supabase
    .from('inventory_uoms')
    .select('name')
    .eq('id', baseUom.uom_id)
    .maybeSingle()

  if (uomError) throw new Error(`Failed to load base UOM: ${uomError.message}`)

  const baseUomName = (uom?.name ?? '').toLowerCase()
  if (['litre', 'liter', 'litres', 'liters', 'l', 'lt'].includes(baseUomName)) {
    return { product_id, pour_size_ml, base_quantity: (quantity * pour_size_ml) / 1000 }
  }

  return { product_id, pour_size_ml, base_quantity: quantity }
}

/**
 * Resolves the recipe that produces an order line item (F2). Matching order:
 * recipe OUTPUT name (e.g. a cocktail name), then recipe name itself. Only
 * active recipes qualify. Returns null when no recipe applies — the line is
 * then deducted directly against its product.
 */
async function resolveRecipeForItem(itemName: string): Promise<string | null> {
  const supabase = getInventoryClient()

  const { data: byOutput, error: outputError } = await supabase
    .from('inventory_recipe_outputs')
    .select('recipe_id, inventory_recipes!inner(created_at)')
    .eq('inventory_recipes.is_active', true)
    .ilike('name', itemName)
    .order('recipe_id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (outputError) throw new Error(`Failed to resolve recipe output: ${outputError.message}`)

  if (byOutput?.recipe_id) return byOutput.recipe_id as string

  const { data: byName, error: recipeError } = await supabase
    .from('inventory_recipes')
    .select('id')
    .eq('is_active', true)
    .ilike('name', itemName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recipeError) throw new Error(`Failed to resolve recipe: ${recipeError.message}`)

  return byName?.id ?? null
}

export async function syncOrderItems(orderId: string): Promise<OrderItemDetail> {
  const supabase = getInventoryClient()

  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)

  const parsed = parseOrderItemsJson(order.items_json)

  for (const item of parsed) {
    const match = await matchItemToProduct(item)
    const recipeId = await resolveRecipeForItem(item.name)
    const reconciliationStatus = match.product_id
      ? 'matched'
      : item.inventory_required
        ? 'requires_mapping'
        : 'not_required'

    let existing = await supabase
      .from('order_items')
      .select('id, transaction_id')
      .eq('order_id', orderId)
      .eq('source_line_id', item.source_line_id)
      .maybeSingle()

    // One-time bridge for rows normalized before source_line_id existed.
    if (!existing.data && item.source_type === 'legacy') {
      existing = await supabase
        .from('order_items')
        .select('id, transaction_id')
        .eq('order_id', orderId)
        .eq('item_name', item.name)
        .like('source_line_id', 'legacy-existing:%')
        .limit(1)
        .maybeSingle()
    }

    if (existing.data) {
      if (existing.data.transaction_id) continue
      const { error } = await supabase
        .from('order_items')
        .update({
          source_line_id: item.source_line_id,
          source_type: item.source_type,
          source_item_id: item.source_item_id,
          inventory_required: item.inventory_required,
          reconciliation_status: reconciliationStatus,
          quantity: item.quantity,
          unit_price: item.unit_price,
          selected_size: item.selected_size,
          notes: item.notes,
          product_id: match.product_id,
          pour_size_ml: match.pour_size_ml,
          base_quantity: match.base_quantity,
          recipe_id: recipeId,
          matched_at: match.product_id ? new Date().toISOString() : null,
        })
        .eq('id', existing.data.id)
      if (error) throw new Error(`Failed to update normalized order line: ${error.message}`)
    } else {
      const { error } = await supabase.from('order_items').insert({
        order_id: orderId,
        source_line_id: item.source_line_id,
        source_type: item.source_type,
        source_item_id: item.source_item_id,
        inventory_required: item.inventory_required,
        reconciliation_status: reconciliationStatus,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_size: item.selected_size,
        notes: item.notes,
        product_id: match.product_id,
        pour_size_ml: match.pour_size_ml,
        base_quantity: match.base_quantity,
        recipe_id: recipeId,
        matched_at: match.product_id ? new Date().toISOString() : null,
      })
      if (error) throw new Error(`Failed to normalize order line: ${error.message}`)
    }
  }

  return listOrderItems(orderId)
}

/**
 * The v2 RPC is the only deduction path. It first blocks required unmatched
 * lines, then invokes the existing atomic deduction transaction.
 */
export async function deductOrderItems(orderId: string, locationId: string): Promise<{ deducted: number; skipped: number }> {
  const supabase = getInventoryClient()

  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)
  if (order.status !== 'completed') {
    throw new Error(`Only completed orders can be deducted (status: ${order.status})`)
  }

  const { data, error } = await supabase.rpc('deduct_order_items_v2', {
    p_order_id: orderId,
    p_location_id: locationId,
  })

  if (error || !data) {
    throw new Error(`Order deduction failed atomically: ${error?.message ?? 'no result returned'}`)
  }

  const result = data as { deducted?: number | null; skipped?: number | null; already_deducted?: boolean | null }
  return {
    deducted: Number(result.deducted ?? 0),
    skipped: Number(result.skipped ?? 0),
  }
}

export async function listOrderItems(orderId: string): Promise<OrderItemDetail> {
  const supabase = getInventoryClient()
  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)

  const { data, error } = await supabase
    .from('order_items')
    .select('*, inventory_products(id, name, sku)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Failed to list normalized order items: ${error.message}`)

  return {
    order_id: orderId,
    status: order.status,
    items: (data ?? []) as unknown as OrderItem[],
  }
}

export async function autoDeductCompletedOrder(orderId: string): Promise<{ deducted: number; skipped: number }> {
  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)
  const locationId = await resolveOrderStationLocation(order.station)

  await syncOrderItems(orderId)
  return deductOrderItems(orderId, locationId)
}
