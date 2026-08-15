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

/**
 * Resolves the recipe that produces an order line item (F2). Matching order:
 * recipe OUTPUT name (e.g. a cocktail name), then recipe name itself. Only
 * active recipes qualify. Returns null when no recipe applies — the line is
 * then deducted directly against its product.
 */
async function resolveRecipeForItem(itemName: string): Promise<string | null> {
  const supabase = getInventoryClient()

  const { data: byOutput } = await supabase
    .from('inventory_recipe_outputs')
    .select('recipe_id, inventory_recipes!inner(created_at)')
    .eq('inventory_recipes.is_active', true)
    .ilike('name', itemName)
    .order('recipe_id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (byOutput?.recipe_id) return byOutput.recipe_id as string

  const { data: byName } = await supabase
    .from('inventory_recipes')
    .select('id')
    .eq('is_active', true)
    .ilike('name', itemName)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return byName?.id ?? null
}

export async function syncOrderItems(orderId: string): Promise<OrderItemDetail> {
  const supabase = getInventoryClient()

  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)

  const parsed = parseOrderItemsJson(order.items_json)

  for (const item of parsed) {
    const match = await matchItemToProduct(item.name, item.quantity)
    const recipeId = await resolveRecipeForItem(item.name)

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
          recipe_id: recipeId,
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
        recipe_id: recipeId,
        matched_at: match.product_id ? new Date().toISOString() : null,
      })
    }
  }

  return listOrderItems(orderId)
}

interface PendingLine {
  id: string
  product_id: string | null
  base_quantity: number | null
  item_name: string
  quantity: number
  transaction_id: string | null
  recipe_id: string | null
}

/**
 * F2 atomic deduction. Primary path: the deduct_order_items RPC performs the
 * whole deduction in ONE database transaction (order locked, status must be
 * completed, per-ingredient ledger rows, balance cache, audit; any failure
 * rolls back everything). Falls back to the legacy per-line engine loop when
 * the RPC is unavailable (migration not yet applied) — the fallback is
 * retry-safe but not atomic (matches the receive/import fallback pattern).
 */
export async function deductOrderItems(orderId: string, locationId: string): Promise<{ deducted: number; skipped: number }> {
  const supabase = getInventoryClient()

  const order = await getOrder(orderId)
  if (!order) throw new Error(`Order not found: ${orderId}`)
  if (order.status !== 'completed') {
    throw new Error(`Only completed orders can be deducted (status: ${order.status})`)
  }

  const { data, error } = await supabase.rpc('deduct_order_items', {
    p_order_id: orderId,
    p_location_id: locationId,
  })

  if (!error && data) {
    const result = data as { deducted?: number | null; skipped?: number | null; already_deducted?: boolean | null }
    return {
      deducted: Number(result.deducted ?? 0),
      skipped: Number(result.skipped ?? 0),
    }
  }

  return deductOrderItemsEngine(orderId, locationId)
}

async function deductOrderItemsEngine(orderId: string, locationId: string): Promise<{ deducted: number; skipped: number }> {
  const supabase = getInventoryClient()

  const { data: rows } = await supabase
    .from('order_items')
    .select('id, product_id, base_quantity, item_name, transaction_id, quantity, recipe_id')
    .eq('order_id', orderId)
    .is('transaction_id', null)
    .is('deducted_at', null)

  const lines = (rows ?? []) as PendingLine[]
  const pending = lines.filter((l: PendingLine) => l.product_id !== null)

  let deducted = 0
  let skipped = lines.length - pending.length
  const failures: string[] = []

  for (const line of pending) {
    if (line.recipe_id) {
      try {
        const lineDeducted = await deductRecipeLine(line, locationId, orderId)
        if (lineDeducted) deducted++
      } catch (error) {
        failures.push(`${line.item_name}: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
      continue
    }

    if (!line.base_quantity || line.base_quantity <= 0) {
      skipped++
      continue
    }

    try {
      const transaction = await createTransaction({
        product_id: line.product_id as string,
        location_id: locationId,
        transaction_type: 'sale',
        quantity: line.base_quantity,
        reason_type: 'SALE',
        reference_type: 'pos_order',
        reference_id: orderId,
        order_id: orderId,
        order_line_id: line.id,
        recipe_id: null,
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
    } catch (error) {
      failures.push(`${line.item_name}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Order deduction partially failed (${failures.length} of ${pending.length} lines). ` +
      `Completed lines are recorded and will be skipped on retry. Failures: ${failures.join('; ')}`,
    )
  }

  return { deducted, skipped }
}

async function deductRecipeLine(line: PendingLine, locationId: string, orderId: string): Promise<boolean> {
  const supabase = getInventoryClient()

  const { data: recipe } = await supabase
    .from('inventory_recipes')
    .select('yield_quantity')
    .eq('id', line.recipe_id)
    .maybeSingle()

  if (!recipe) throw new Error(`Recipe ${line.recipe_id} not found`)

  const { data: ingredients, error: ingredientsError } = await supabase
    .from('inventory_recipe_ingredients')
    .select('product_id, quantity, wastage_pct')
    .eq('recipe_id', line.recipe_id)

  if (ingredientsError) {
    throw new Error(`Failed to load ingredients for recipe ${line.recipe_id}: ${ingredientsError.message}`)
  }

  const ingredientList = (ingredients ?? []) as Array<{ product_id: string; quantity: number | null; wastage_pct: number | null }>

  const productIds = [...new Set(ingredientList.map(i => i.product_id))]
  const productNames = new Map<string, string>()
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('inventory_products')
      .select('id, name')
      .in('id', productIds)
    for (const p of (products ?? []) as Array<{ id: string; name: string }>) {
      productNames.set(p.id, p.name)
    }
  }

  const yieldQty = Number(recipe.yield_quantity ?? 1)
  const scale = line.quantity / (yieldQty > 0 ? yieldQty : 1)

  // Retry safety: ingredient rows a previous engine run already created for
  // this line are skipped (they reference the line id on the ledger)
  const { data: existing } = await supabase
    .from('inventory_transactions')
    .select('product_id')
    .eq('reference_type', 'pos_order')
    .eq('reference_id', line.id)

  const existingProducts = new Set((existing ?? []).map((t: { product_id: string }) => t.product_id))

  for (const ing of ingredientList) {
    if (existingProducts.has(ing.product_id)) continue

    const needed = Number(ing.quantity) * scale * (1 + Number(ing.wastage_pct ?? 0) / 100)

    await createTransaction({
      product_id: ing.product_id,
      location_id: locationId,
      transaction_type: 'sale',
      quantity: needed,
      reason_type: 'SALE',
      reference_type: 'pos_order',
      reference_id: line.id,
      order_id: orderId,
      order_line_id: line.id,
      recipe_id: line.recipe_id,
      notes: `Auto-deducted recipe ingredient: ${productNames.get(ing.product_id) ?? ing.product_id} for ${line.item_name} (x${line.quantity})`,
    })
  }

  await supabase
    .from('order_items')
    .update({ deducted_at: new Date().toISOString() })
    .eq('id', line.id)

  return true
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