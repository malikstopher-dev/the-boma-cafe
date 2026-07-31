import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'
import type { ProductionRun, ProductionRunDetail, ProductionRunItem, ProductionRunStatus, CreateTransactionInput } from './types'

export async function createProductionRun(data: {
  recipe_id: string
  location_id: string
  quantity_planned: number
  cost_centre_id?: string | null
  started_by?: string | null
  notes?: string | null
}): Promise<ProductionRunDetail> {
  const supabase = getInventoryClient()

  const { data: run } = await supabase
    .from('inventory_production_runs')
    .insert({
      recipe_id: data.recipe_id,
      location_id: data.location_id,
      quantity_planned: data.quantity_planned,
      cost_centre_id: data.cost_centre_id ?? null,
      started_by: data.started_by ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single()

  if (!run) throw new Error('Failed to create production run')

  const { data: ingredients } = await supabase
    .from('inventory_recipe_ingredients')
    .select('product_id, quantity, wastage_pct, sort_order')
    .eq('recipe_id', data.recipe_id)

  const { data: outputs } = await supabase
    .from('inventory_recipe_outputs')
    .select('name, quantity, sort_order')
    .eq('recipe_id', data.recipe_id)

  const runItems: ProductionRunItem[] = []
  const scale = data.quantity_planned

  for (const ing of (ingredients ?? [])) {
    const { data: item } = await supabase
      .from('inventory_production_run_items')
      .insert({
        production_run_id: run.id,
        product_id: ing.product_id,
        direction: 'consumed',
        quantity: Number(ing.quantity) * scale,
        wastage_pct: ing.wastage_pct ?? 0,
        sort_order: ing.sort_order ?? 0,
      })
      .select('*')
      .single()
    if (item) {
      const { data: product } = await supabase
        .from('inventory_products')
        .select('name')
        .eq('id', ing.product_id)
        .maybeSingle()
      runItems.push({
        id: item.id,
        production_run_id: item.production_run_id,
        product_id: item.product_id,
        direction: 'consumed',
        quantity: Number(item.quantity),
        transaction_id: item.transaction_id,
        wastage_pct: Number(item.wastage_pct),
        sort_order: item.sort_order,
        product_name: product?.name ?? 'Unknown',
      })
    }
  }

  return {
    ...(run as ProductionRun),
    items: runItems,
  }
}

export async function getProductionRun(id: string): Promise<ProductionRunDetail | null> {
  const supabase = getInventoryClient()

  const { data: run } = await supabase
    .from('inventory_production_runs')
    .select('*, inventory_recipes!inner(name)')
    .eq('id', id)
    .maybeSingle()

  if (!run) return null

  const { data: items } = await supabase
    .from('inventory_production_run_items')
    .select('*, inventory_products!inner(name)')
    .eq('production_run_id', id)
    .order('sort_order')

  return {
    ...(run as ProductionRun),
    recipe_name: (run as any).inventory_recipes?.name ?? null,
    items: (items ?? []).map((i: any) => ({
      id: i.id,
      production_run_id: i.production_run_id,
      product_id: i.product_id,
      direction: i.direction,
      quantity: Number(i.quantity),
      transaction_id: i.transaction_id,
      wastage_pct: Number(i.wastage_pct),
      sort_order: i.sort_order,
      product_name: i.inventory_products?.name ?? 'Unknown',
    })),
  }
}

export async function listProductionRuns(filters?: {
  locationId?: string
  recipeId?: string
  status?: ProductionRunStatus
  limit?: number
}): Promise<ProductionRunDetail[]> {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_production_runs')
    .select('*, inventory_recipes(name)')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 50)

  if (filters?.locationId) query = query.eq('location_id', filters.locationId)
  if (filters?.recipeId) query = query.eq('recipe_id', filters.recipeId)
  if (filters?.status) query = query.eq('status', filters.status)

  const { data } = await query

  return (data ?? []).map((r: any) => ({
    ...(r as ProductionRun),
    recipe_name: r.inventory_recipes?.name ?? null,
    items: [],
  }))
}

export async function startProductionRun(id: string, startedBy?: string | null): Promise<ProductionRun> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_production_runs')
    .update({
      status: 'in_progress',
      started_by: startedBy ?? null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'planned')
    .select()
    .single()

  if (!data) throw new Error('Production run not found or not in planned status')
  return data as ProductionRun
}

export async function completeProductionRun(
  id: string,
  quantityCompleted?: number,
  completedBy?: string | null,
): Promise<ProductionRunDetail> {
  const supabase = getInventoryClient()
  const run = await getProductionRun(id)
  if (!run) throw new Error('Production run not found')
  if (run.status === 'completed') throw new Error('Production run already completed')
  if (run.status === 'cancelled') throw new Error('Production run is cancelled')

  const completedQty = quantityCompleted ?? run.quantity_planned
  const scale = completedQty / (run.quantity_planned || 1)

  const failures: string[] = []

  for (const item of run.items) {
    if (item.transaction_id) continue

    const baseQty = item.quantity * scale
    const qty = item.direction === 'consumed'
      ? -(baseQty * (1 + item.wastage_pct / 100))
      : baseQty

    try {
      const txn = await createTransaction({
        product_id: item.product_id,
        location_id: run.location_id,
        transaction_type: 'production',
        quantity: qty,
        cost_centre_id: run.cost_centre_id,
        reason_type: 'PRODUCTION',
        reason_notes: run.recipe_name ? `Production: ${run.recipe_name}` : 'Production run',
        reference_type: 'production_run',
        reference_id: run.id,
        performed_by: completedBy ?? null,
      } satisfies CreateTransactionInput)

      await supabase
        .from('inventory_production_run_items')
        .update({ transaction_id: txn.id })
        .eq('id', item.id)
    } catch (error) {
      failures.push(`${item.product_name ?? item.product_id}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Production run completion partially failed (${failures.length} of ${run.items.length} items). ` +
      `Completed items are recorded and will be skipped on retry. Failures: ${failures.join('; ')}`,
    )
  }

  const { data: updated } = await supabase
    .from('inventory_production_runs')
    .update({
      status: 'completed',
      quantity_completed: completedQty,
      completed_by: completedBy ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (!updated) throw new Error('Failed to complete production run')

  return getProductionRun(id) as Promise<ProductionRunDetail>
}

export async function cancelProductionRun(id: string, cancelledBy?: string | null): Promise<ProductionRun> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_production_runs')
    .update({
      status: 'cancelled',
      completed_by: cancelledBy ?? null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['planned', 'in_progress'])
    .select()
    .single()

  if (!data) throw new Error('Production run not found or already completed')
  return data as ProductionRun
}
