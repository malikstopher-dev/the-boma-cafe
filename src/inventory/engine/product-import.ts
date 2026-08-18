// E1A: Smart Product Import — engine.
//
// Applies a parsed product import (see import/product-parser.ts): resolves or
// creates categories and suppliers from the sheet's own data (never invented),
// resolves UOMs against existing UOMs only (unmatched unit text is left
// blank — no UOM is ever fabricated), creates/updates products through the
// same fields the products API allows, records the batch in
// inventory_product_imports so "Undo Last Import" can reverse it.
//
// Never touches the ledger: an import is a catalogue operation, not a stock
// movement.

import { getInventoryClient } from '@/inventory/lib/db'
import type { ParsedProductRow } from '@/inventory/import/product-parser'
import type { InventoryProduct, ProductImportRecord } from '@/inventory/engine/types'

export type ImportAction = 'create' | 'update' | 'skip'

export interface ImportDecisionRow {
  rowNumber: number
  action: ImportAction
  name: string | null
  sku: string | null
  barcode: string | null
  unitCost: number | null
  unitText: string | null
  supplierName: string | null
  categoryName: string | null
}

export interface ProductImportPreviewRow extends ParsedProductRow {
  existing?: { id: string; name: string; sku: string | null; barcode: string | null } | null
}

export interface ApplyProductImportInput {
  rows: ImportDecisionRow[]
  inventoryType: string
  filename: string
  sheetName?: string | null
  createdByAdminId?: string | null
}

export interface ApplyProductImportResult {
  importId: string
  created: number
  updated: number
  skipped: number
  createdIds: string[]
  updatedIds: string[]
  skippedNames: string[]
  createdSuppliers: string[]
  createdCategories: string[]
}

interface Lookup {
  suppliers: Map<string, string>
  categories: Map<string, string>
  uoms: Map<string, string>
}

async function buildLookup(supabase: ReturnType<typeof getInventoryClient>): Promise<Lookup> {
  const [supRes, catRes, uomRes] = await Promise.all([
    supabase.from('inventory_suppliers').select('id, name').eq('is_active', true),
    supabase.from('inventory_categories').select('id, name').eq('is_active', true),
    supabase.from('inventory_uoms').select('id, name, symbol'),
  ])
  const suppliers = new Map<string, string>()
  for (const s of supRes.data ?? []) suppliers.set(String(s.name).toLowerCase(), s.id)
  const categories = new Map<string, string>()
  for (const c of catRes.data ?? []) categories.set(String(c.name).toLowerCase(), c.id)
  const uoms = new Map<string, string>()
  for (const u of uomRes.data ?? []) {
    uoms.set(String(u.name).toLowerCase(), u.id)
    if (u.symbol) uoms.set(String(u.symbol).toLowerCase(), u.id)
  }
  return { suppliers, categories, uoms }
}

async function resolveOrCreateSupplier(
  supabase: ReturnType<typeof getInventoryClient>,
  lookup: Lookup,
  name: string | null,
  createdNames: string[],
): Promise<string | null> {
  if (!name) return null
  const key = name.toLowerCase()
  const existing = lookup.suppliers.get(key)
  if (existing) return existing
  const { data, error } = await supabase
    .from('inventory_suppliers')
    .insert({ name: name.trim() })
    .select('id')
    .single()
  if (error || !data) return null
  lookup.suppliers.set(key, data.id)
  createdNames.push(name.trim())
  return data.id
}

async function resolveOrCreateCategory(
  supabase: ReturnType<typeof getInventoryClient>,
  lookup: Lookup,
  name: string | null,
  createdNames: string[],
): Promise<string | null> {
  if (!name) return null
  const key = name.toLowerCase()
  const existing = lookup.categories.get(key)
  if (existing) return existing
  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({ name: name.trim() })
    .select('id')
    .single()
  if (error || !data) return null
  lookup.categories.set(key, data.id)
  createdNames.push(name.trim())
  return data.id
}

function resolveUom(lookup: Lookup, unitText: string | null): string | null {
  if (!unitText) return null
  const key = unitText.toLowerCase().trim()
  // Normalize common written forms: "TOTS" -> "Tot", "7kg" -> "Kg", "L" -> "l".
  const candidates = new Set<string>([key])
  const norm = key
    .replace(/^[\d.,\s]+/, '')
    .replace(/s$/, '')
    .trim()
  if (norm && norm !== key) candidates.add(norm)
  const plural = key + 's'
  candidates.add(plural)
  for (const c of candidates) {
    const hit = lookup.uoms.get(c)
    if (hit) return hit
  }
  return null
}

async function findExistingProducts(supabase: ReturnType<typeof getInventoryClient>): Promise<Map<string, { id: string; name: string; sku: string | null; barcode: string | null }>> {
  const { data } = await supabase
    .from('inventory_products')
    .select('id, name, sku, barcode')
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(500)
  const byKey = new Map<string, { id: string; name: string; sku: string | null; barcode: string | null }>()
  for (const p of data ?? []) {
    byKey.set(`name:${String(p.name).toLowerCase()}`, p)
    if (p.sku) byKey.set(`sku:${String(p.sku).toLowerCase()}`, p)
    if (p.barcode) byKey.set(`barcode:${String(p.barcode).toLowerCase()}`, p)
  }
  return byKey
}

// Enrich parsed rows with existing-product matches (by SKU, barcode, then
// name — the same identity order the products API uses).
export async function previewProductImport(
  rows: ParsedProductRow[],
): Promise<ProductImportPreviewRow[]> {
  const supabase = getInventoryClient()
  const existing = await findExistingProducts(supabase)
  return rows.map(row => {
    let match: ProductImportPreviewRow['existing'] = null
    if (row.sku.value) {
      const hit = existing.get(`sku:${row.sku.value.toLowerCase()}`)
      if (hit) match = hit
    }
    if (!match && row.barcode.value) {
      const hit = existing.get(`barcode:${row.barcode.value.toLowerCase()}`)
      if (hit) match = hit
    }
    if (!match && row.name.value) {
      const hit = existing.get(`name:${row.name.value.toLowerCase()}`)
      if (hit) match = hit
    }
    return { ...row, existing: match ?? null }
  })
}

export async function applyProductImport(input: ApplyProductImportInput): Promise<ApplyProductImportResult> {
  const supabase = getInventoryClient()
  const lookup = await buildLookup(supabase)
  const existing = await findExistingProducts(supabase)

  const createdIds: string[] = []
  const updatedIds: string[] = []
  const updatedSnapshots: { product_id: string; before: Record<string, unknown> }[] = []
  const skippedNames: string[] = []
  const createdSuppliers: string[] = []
  const createdCategories: string[] = []

  for (const row of input.rows) {
    if (!row.name) {
      skippedNames.push(`row ${row.rowNumber}`)
      continue
    }
    const name = row.name.trim()
    if (!name) {
      skippedNames.push(`row ${row.rowNumber}`)
      continue
    }
    const lowerName = name.toLowerCase()

    const sku = row.sku?.trim() || null
    const barcode = row.barcode?.trim() || null
    const unitCost = row.unitCost ?? null
    const unitText = row.unitText?.trim() || null
    const supplierId = await resolveOrCreateSupplier(supabase, lookup, row.supplierName, createdSuppliers)
    const categoryId = await resolveOrCreateCategory(supabase, lookup, row.categoryName, createdCategories)
    const baseUomId = resolveUom(lookup, unitText)

    // Identity: existing by SKU/barcode/name first (create/update/skip choice
    // is the operator's — made in the preview and re-checked here defensively).
    let existingProduct = existing.get(`name:${lowerName}`)
    if (sku) {
      const bySku = existing.get(`sku:${sku.toLowerCase()}`)
      if (bySku) existingProduct = bySku
    }
    if (barcode) {
      const byBarcode = existing.get(`barcode:${barcode.toLowerCase()}`)
      if (byBarcode) existingProduct = byBarcode
    }

    // Operator semantics: 'create' always creates (even when a match exists —
    // the operator deliberately wants a separate product); 'update' requires a
    // match (skipped otherwise); 'skip' is a no-op.
    const action: ImportAction =
      row.action === 'skip'
        ? 'skip'
        : row.action === 'create'
          ? 'create'
          : existingProduct
            ? 'update'
            : 'skip'

    if (action === 'skip') {
      skippedNames.push(name)
      continue
    }

    try {
      if (action === 'create') {
        const insertPayload: Record<string, unknown> = {
          name,
          sku,
          barcode,
          category_id: categoryId,
          inventory_type: input.inventoryType || 'GENERAL',
          preferred_supplier_id: supplierId,
          unit_cost: unitCost,
        }
        const { data, error } = await supabase
          .from('inventory_products')
          .insert(insertPayload)
          .select('id')
          .single()
        if (error) {
          skippedNames.push(name)
          continue
        }
        if (baseUomId) {
          await supabase
            .from('inventory_product_uoms')
            .insert({
              product_id: data.id,
              uom_id: baseUomId,
              is_base: true,
              is_display: false,
              conversion_factor: 1,
            })
        }
        await supabase.from('inventory_audit_log').insert({
          table_name: 'inventory_products',
          record_id: data.id,
          action: 'created',
          changes: insertPayload,
        })
        createdIds.push(data.id)
        existing.set(`name:${lowerName}`, { id: data.id, name, sku, barcode })
        if (sku) existing.set(`sku:${sku.toLowerCase()}`, { id: data.id, name, sku, barcode })
        if (barcode) existing.set(`barcode:${barcode.toLowerCase()}`, { id: data.id, name, sku, barcode })
      } else {
        if (!existingProduct) {
          // Unreachable by construction ('update' requires a match), but
          // strict-mode-safe: treat as a skip.
          skippedNames.push(name)
          continue
        }
        // Update path: read current values for the undo snapshot, then apply
        // only the fields the sheet actually provided (null = keep as-is).
        const { data: current } = await supabase
          .from('inventory_products')
          .select('name, sku, barcode, category_id, preferred_supplier_id, unit_cost, reorder_threshold, reorder_quantity')
          .eq('id', existingProduct.id)
          .maybeSingle()
        const updates: Record<string, unknown> = {}
        updates.name = name
        if (sku !== null) updates.sku = sku
        if (barcode !== null) updates.barcode = barcode
        if (categoryId !== null) updates.category_id = categoryId
        if (supplierId !== null) updates.preferred_supplier_id = supplierId
        if (unitCost !== null) updates.unit_cost = unitCost
        updates.updated_at = new Date().toISOString()

        const { error } = await supabase
          .from('inventory_products')
          .update(updates)
          .eq('id', existingProduct.id)
        if (error) {
          skippedNames.push(name)
          continue
        }
        const before: Record<string, unknown> = {}
        for (const key of Object.keys(updates)) {
          if (key !== 'updated_at') before[key] = current ? current[key as keyof typeof current] : undefined
        }
        updatedIds.push(existingProduct.id)
        updatedSnapshots.push({ product_id: existingProduct.id, before })
        await supabase.from('inventory_audit_log').insert({
          table_name: 'inventory_products',
          record_id: existingProduct.id,
          action: 'updated',
          changes: updates,
        })
        // Refresh the in-memory identity maps with the new values.
        existing.set(`name:${lowerName}`, { id: existingProduct.id, name, sku, barcode })
        if (sku) existing.set(`sku:${sku.toLowerCase()}`, { id: existingProduct.id, name, sku, barcode })
        if (barcode) existing.set(`barcode:${barcode.toLowerCase()}`, { id: existingProduct.id, name, sku, barcode })
      }
    } catch {
      skippedNames.push(name)
    }
  }

  const { data: importRow, error: importError } = await supabase
    .from('inventory_product_imports')
    .insert({
      filename: input.filename,
      sheet_name: input.sheetName ?? null,
      inventory_type: input.inventoryType || 'GENERAL',
      created_by_admin_id: input.createdByAdminId ?? null,
      created_ids: createdIds,
      updated_ids: updatedIds,
      updated_snapshots: updatedSnapshots,
    })
    .select('id')
    .single()

  if (importError || !importRow) {
    throw new Error('Failed to record product import: ' + (importError?.message ?? 'unknown'))
  }

  return {
    importId: importRow.id,
    created: createdIds.length,
    updated: updatedIds.length,
    skipped: skippedNames.length,
    createdIds,
    updatedIds,
    skippedNames,
    createdSuppliers,
    createdCategories,
  }
}

// "Undo Last Import": hard-delete created products with no transactions
// (archive the ones that do have history), restore updated products verbatim
// from their before-snapshots, and mark the import rolled back.
export async function undoProductImport(importId: string): Promise<{ removed: number; archived: number; restored: number }> {
  const supabase = getInventoryClient()
  const { data: importRow, error } = await supabase
    .from('inventory_product_imports')
    .select('*')
    .eq('id', importId)
    .maybeSingle()
  if (error || !importRow) {
    throw new Error('Import not found')
  }
  if (importRow.status !== 'applied') {
    throw new Error('Import is not applied (nothing to undo)')
  }

  let removed = 0
  let archived = 0
  for (const productId of (importRow.created_ids ?? []) as string[]) {
    const { count } = await supabase
      .from('inventory_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
    if (count && count > 0) {
      await supabase
        .from('inventory_products')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', productId)
      archived++
    } else {
      await supabase.from('inventory_product_uoms').delete().eq('product_id', productId)
      await supabase.from('inventory_products').delete().eq('id', productId)
      removed++
    }
  }

  let restored = 0
  for (const snap of (importRow.updated_snapshots ?? []) as { product_id: string; before: Record<string, unknown> }[]) {
    const before = snap.before ?? {}
    if (!snap.product_id || Object.keys(before).length === 0) continue
    const restorePayload: Record<string, unknown> = { ...before, updated_at: new Date().toISOString() }
    await supabase
      .from('inventory_products')
      .update(restorePayload)
      .eq('id', snap.product_id)
    restored++
  }

  await supabase
    .from('inventory_product_imports')
    .update({ status: 'rolled_back' })
    .eq('id', importId)
  await supabase.from('inventory_audit_log').insert({
    table_name: 'inventory_product_imports',
    record_id: importId,
    action: 'updated',
    changes: { status: 'rolled_back', removed, archived, restored },
  })

  return { removed, archived, restored }
}

export async function getLastProductImport(): Promise<ProductImportRecord | null> {
  const supabase = getInventoryClient()
  const { data } = await supabase
    .from('inventory_product_imports')
    .select('*')
    .eq('status', 'applied')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ProductImportRecord | null) ?? null
}