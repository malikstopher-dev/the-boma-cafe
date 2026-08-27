import { getInventoryClient } from '../lib/db'
import type { ReorderSuggestion, ReorderRule, InventoryType } from './types'

// Defaults for products without a reorder rule (must match forecasting.ts:
// rule-less products evaluate with min_level 0 and lead_time_days 3).
const FALLBACK_LEAD_TIME_DAYS = 3

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

  const { data: rules, error: rulesError } = await rulesQuery
  if (rulesError) throw new Error(`Failed to load reorder rules: ${rulesError.message}`)

  const ruleList = (rules ?? []) as any[]

  const suggestions: ReorderSuggestion[] = []

  for (const rule of ruleList) {
    const productId = rule.product_id

    const { data: balanceData, error: balanceError } = await supabase
      .from('inventory_product_balances')
      .select('balance')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .maybeSingle()
    if (balanceError) throw new Error(`Failed to load reorder balance: ${balanceError.message}`)

    const currentStock = balanceData ? Number(balanceData.balance) : 0

    const { data: saleTxns, error: salesError } = await supabase
      .from('inventory_transactions')
      .select('quantity')
      .eq('product_id', productId)
      .eq('location_id', locationId)
      .in('transaction_type', ['sale', 'sale_bottle'])
      .gte('created_at', since)
    if (salesError) throw new Error(`Failed to load reorder sales: ${salesError.message}`)

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
        const { data: supplier, error: supplierError } = await supabase
          .from('inventory_suppliers')
          .select('name')
          .eq('id', rule.preferred_supplier_id)
          .maybeSingle()
        if (supplierError) throw new Error(`Failed to load preferred supplier: ${supplierError.message}`)
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

  // ── Rule-less fallback (O4) ─────────────────────────────────────────────
  // Products WITHOUT a reorder rule never reach the rule loop, so the Reorder
  // view could claim "healthy" while the Forecast view flags them (e.g. out of
  // stock). Mirror the Forecast engine's state machine for rule-less products
  // (min_level 0, lead_time_days 3) so both views surface the same attention set.
  // Products WITH any rule (incl. auto_suggest=false) stay excluded — a
  // deliberate disable is honoured.
  const { data: anyRules, error: anyRulesError } = await supabase
    .from('inventory_reorder_rules')
    .select('product_id')
    .eq('location_id', locationId)
  if (anyRulesError) throw new Error(`Failed to load product reorder coverage: ${anyRulesError.message}`)
  const ruledProductIds = new Set((anyRules ?? []).map((r: { product_id: string }) => r.product_id))

  let productsQuery = supabase
    .from('inventory_products')
    .select('id, name, sku, inventory_type')
    .eq('is_active', true)
    .is('deleted_at', null)

  if (inventoryType) {
    productsQuery = productsQuery.eq('inventory_type', inventoryType)
  }

  const { data: products, error: productsError } = await productsQuery
  if (productsError) throw new Error(`Failed to load reorder products: ${productsError.message}`)

  const { data: balanceRows, error: balancesError } = await supabase
    .from('inventory_product_balances')
    .select('product_id, balance')
    .eq('location_id', locationId)
  if (balancesError) throw new Error(`Failed to load reorder balances: ${balancesError.message}`)

  const balanceMap = new Map<string, number>()
  for (const b of (balanceRows ?? []) as { product_id: string; balance: number }[]) {
    balanceMap.set(b.product_id, Number(b.balance))
  }

  const { data: saleRows, error: saleRowsError } = await supabase
    .from('inventory_transactions')
    .select('product_id, quantity')
    .in('transaction_type', ['sale', 'sale_bottle'])
    .eq('location_id', locationId)
    .gte('created_at', since)
  if (saleRowsError) throw new Error(`Failed to load reorder demand: ${saleRowsError.message}`)

  const usageMap = new Map<string, number>()
  for (const t of (saleRows ?? []) as { product_id: string; quantity: number }[]) {
    usageMap.set(t.product_id, (usageMap.get(t.product_id) ?? 0) + Math.abs(Number(t.quantity)))
  }

  for (const product of (products ?? []) as { id: string; name: string; sku: string | null; inventory_type: InventoryType }[]) {
    if (ruledProductIds.has(product.id)) continue

    const currentStock = balanceMap.get(product.id) ?? 0
    const dailyUsage = (usageMap.get(product.id) ?? 0) / days

    let needsAttention = false
    let estimatedDaysUntilStockout: number | null = null

    if (currentStock <= 0) {
      needsAttention = true
      estimatedDaysUntilStockout = 0
    } else if (dailyUsage > 0 && currentStock / dailyUsage <= FALLBACK_LEAD_TIME_DAYS) {
      needsAttention = true
      estimatedDaysUntilStockout = currentStock / dailyUsage
    }

    if (!needsAttention) continue

    const suggestedQuantity = currentStock <= 0
      ? Math.max(1, Math.ceil(dailyUsage * FALLBACK_LEAD_TIME_DAYS))
      : Math.max(1, Math.ceil(FALLBACK_LEAD_TIME_DAYS * dailyUsage - currentStock))

    suggestions.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      inventoryType: product.inventory_type ?? 'GENERAL',
      currentStock,
      minLevel: 0,
      maxLevel: null,
      parLevel: null,
      leadTimeDays: FALLBACK_LEAD_TIME_DAYS,
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      suggestedQuantity,
      urgency: 'critical',
      preferredSupplierId: null,
      preferredSupplierName: null,
      estimatedDaysUntilStockout: estimatedDaysUntilStockout !== null ? Math.round(estimatedDaysUntilStockout * 10) / 10 : null,
    })
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return suggestions
}

export async function getRules(locationId: string): Promise<ReorderRule[]> {
  const supabase = getInventoryClient()

  const { data, error } = await supabase
    .from('inventory_reorder_rules')
    .select('*, inventory_products!inner(id, name, sku)')
    .eq('location_id', locationId)
    .order('inventory_products(name)')
  if (error) throw new Error(`Failed to load reorder rules: ${error.message}`)

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

  const { data, error } = await supabase
    .from('inventory_reorder_rules')
    .upsert(payload, { onConflict: 'product_id, location_id' })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to save reorder rule: ${error?.message ?? 'No row returned'}`)

  return data as ReorderRule
}
