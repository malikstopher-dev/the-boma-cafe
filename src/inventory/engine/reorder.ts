import { getInventoryClient } from '../lib/db'
import type { ReorderSuggestion, ReorderRule } from './types'

export async function getSuggestions(locationId: string, inventoryType?: string): Promise<ReorderSuggestion[]> {
  const supabase = getInventoryClient()
  const days = 30
  const since = new Date(Date.now() - days * 86400000).toISOString()

  let rulesQuery = supabase
    .from('inventory_reorder_rules')
    .select('*, inventory_products!inner(id, name, sku, inventory_type)')
    .eq('location_id', locationId)
    .eq('auto_suggest', true)

  if (inventoryType) {
    rulesQuery = rulesQuery.eq('inventory_products.inventory_type', inventoryType)
  }

  const { data: rules } = await rulesQuery

  if (!rules || rules.length === 0) return []

  const suggestions: ReorderSuggestion[] = []

  for (const rule of rules as any[]) {
    const productId = rule.product_id

    const { data: balanceData } = await supabase
      .from('inventory_product_balances')
      .select('balance')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .maybeSingle()

    const currentStock = balanceData ? Number(balanceData.balance) : 0

    const { data: saleTxns } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .in('transaction_type', ['sale', 'sale_bottle'])
      .gte('created_at', since)

    const totalSold = (saleTxns ?? []).reduce((s, t) => s + Math.abs(Number(t.quantity)), 0)
    const dailyUsage = days > 0 ? totalSold / days : 0

    const minLevel = Number(rule.min_level ?? 0)
    const maxLevel = rule.max_level ? Number(rule.max_level) : null
    const parLevel = rule.par_level ? Number(rule.par_level) : null
    const leadTimeDays = Number(rule.lead_time_days ?? 3)

    const targetLevel = maxLevel ?? parLevel ?? (minLevel * 3)
    const suggestedQuantity = Math.max(0, targetLevel - currentStock)

    const estimatedDaysUntilStockout = dailyUsage > 0 ? currentStock / dailyUsage : null

    let urgency: ReorderSuggestion['urgency'] = 'low'
    if (currentStock <= 0) {
      urgency = 'critical'
    } else if (estimatedDaysUntilStockout !== null && estimatedDaysUntilStockout <= leadTimeDays) {
      urgency = 'critical'
    } else if (currentStock <= minLevel) {
      urgency = 'high'
    } else if (maxLevel && currentStock <= maxLevel * 0.5) {
      urgency = 'medium'
    }

    if (currentStock < targetLevel || urgency !== 'low') {
      let preferredSupplierName: string | null = null
      if (rule.preferred_supplier_id) {
        const { data: supplier } = await supabase
          .from('inventory_suppliers')
          .select('name')
          .eq('id', rule.preferred_supplier_id)
          .maybeSingle()
        preferredSupplierName = supplier?.name ?? null
      }

      suggestions.push({
        productId: productId,
        productName: rule.inventory_products?.name ?? 'Unknown',
        sku: rule.inventory_products?.sku ?? null,
        inventoryType: rule.inventory_products?.inventory_type ?? 'GENERAL',
        currentStock,
        minLevel,
        maxLevel,
        parLevel,
        leadTimeDays,
        dailyUsage: Math.round(dailyUsage * 100) / 100,
        suggestedQuantity: Math.ceil(suggestedQuantity),
        urgency,
        preferredSupplierId: rule.preferred_supplier_id ?? null,
        preferredSupplierName,
        estimatedDaysUntilStockout: estimatedDaysUntilStockout !== null ? Math.round(estimatedDaysUntilStockout * 10) / 10 : null,
      })
    }
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return suggestions
}

export async function getRules(locationId: string): Promise<ReorderRule[]> {
  const supabase = getInventoryClient()

  const { data } = await supabase
    .from('inventory_reorder_rules')
    .select('*, inventory_products!inner(id, name, sku)')
    .eq('location_id', locationId)
    .order('inventory_products(name)')

  return (data ?? []).map((r: any) => ({
    id: r.id,
    product_id: r.product_id,
    location_id: r.location_id,
    min_level: Number(r.min_level),
    max_level: r.max_level ? Number(r.max_level) : null,
    par_level: r.par_level ? Number(r.par_level) : null,
    lead_time_days: r.lead_time_days,
    auto_suggest: r.auto_suggest,
    preferred_supplier_id: r.preferred_supplier_id,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
}

export async function upsertRule(rule: Partial<ReorderRule> & { product_id: string; location_id: string }): Promise<ReorderRule> {
  const supabase = getInventoryClient()

  const payload: Record<string, unknown> = {
    product_id: rule.product_id,
    location_id: rule.location_id,
    min_level: rule.min_level ?? 0,
    max_level: rule.max_level ?? null,
    par_level: rule.par_level ?? null,
    lead_time_days: rule.lead_time_days ?? 3,
    auto_suggest: rule.auto_suggest ?? true,
    preferred_supplier_id: rule.preferred_supplier_id ?? null,
    notes: rule.notes ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data } = await supabase
    .from('inventory_reorder_rules')
    .upsert(payload, { onConflict: 'product_id, location_id' })
    .select()
    .single()

  if (!data) throw new Error('Failed to save reorder rule')

  return data as ReorderRule
}
