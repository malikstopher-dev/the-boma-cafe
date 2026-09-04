import type {
  InventoryProduct,
  InventoryProductUom,
  InventoryLocation,
  InventoryTransaction,
} from '@/inventory/engine/types'
import { linkedUoms, uomLabel, parseOptionalCost, calculateAddStockPreview } from './add-stock'
import type { AddStockPreview } from './add-stock'

export type ReceiptFetch = (input: string, init?: RequestInit) => Promise<Response>

export { linkedUoms, uomLabel, parseOptionalCost, calculateAddStockPreview }
export type { AddStockPreview }

export interface ReceiptLineDraft {
  key: string
  productId: string
  uomId: string
  quantity: string
  unitCost: string
}

export interface ReceiptLineError {
  productId?: string
  uomId?: string
  quantity?: string
  unitCost?: string
}

export interface QuickProductInput {
  name: string
  sku: string
  barcode: string
  categoryId: string
  inventoryType: string
  supplierId: string
  unitCost: string
  baseUomId: string
}

export interface PostedReceipt {
  receipt_id: string
  outcome: string
  transactions: InventoryTransaction[]
  posted_count: number
}

let lineKeyCounter = 0
export function newReceiptLine(): ReceiptLineDraft {
  lineKeyCounter += 1
  return {
    key: `line-${Date.now().toString(36)}-${lineKeyCounter}`,
    productId: '',
    uomId: '',
    quantity: '',
    unitCost: '',
  }
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback for non-secure contexts (tests)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function newIdempotencyKey(): string {
  return uuid()
}

export function linePreview(
  draft: ReceiptLineDraft,
  product: InventoryProduct | null | undefined,
): AddStockPreview | null {
  const link = linkedUoms(product).find(u => u.uom_id === draft.uomId) ?? null
  const baseBalance = product?.current_balance == null ? null : Number(product.current_balance)
  if (!link || baseBalance === null || !Number.isFinite(baseBalance)) return null
  const qty = Number(draft.quantity)
  const cost = parseOptionalCost(draft.unitCost)
  if (!Number.isFinite(qty) || qty <= 0 || Number.isNaN(cost)) return null
  try {
    return calculateAddStockPreview(baseBalance, qty, Number(link.conversion_factor), cost)
  } catch {
    return null
  }
}

export function lineTotal(draft: ReceiptLineDraft): number | null {
  const qty = Number(draft.quantity)
  const cost = parseOptionalCost(draft.unitCost)
  if (!Number.isFinite(qty) || qty <= 0 || cost === null || Number.isNaN(cost)) return null
  return qty * cost
}

export function receiptTotal(drafts: ReceiptLineDraft[]): number | null {
  let total: number | null = null
  for (const draft of drafts) {
    const lineValue = lineTotal(draft)
    if (lineValue !== null) total = (total ?? 0) + lineValue
  }
  return total
}

export interface ValidateReceiptInput {
  locationId: string
  lines: ReceiptLineDraft[]
  productsById: Record<string, InventoryProduct>
  deliveryReference: string
  notes: string
}

export function validateReceiptDraft(input: ValidateReceiptInput): {
  headerErrors: Record<string, string>
  lineErrors: Record<string, Record<string, string>>
} {
  const headerErrors: Record<string, string> = {}
  const lineErrors: Record<string, Record<string, string>> = {}
  if (!input.locationId) headerErrors.locationId = 'Select a receiving location'
  if (input.deliveryReference.length > 120) headerErrors.deliveryReference = 'Reference must be 120 characters or fewer'
  if (input.notes.length > 500) headerErrors.notes = 'Notes must be 500 characters or fewer'
  if (input.lines.length === 0) headerErrors.lines = 'Add at least one item line'

  for (const draft of input.lines) {
    const errors: Record<string, string> = {}
    if (!draft.productId) errors.productId = 'Select an item'
    else {
      const product = input.productsById[draft.productId]
      if (!product) errors.productId = 'Item not found'
      else {
        if (!product.is_active || product.deleted_at) errors.productId = 'This item is no longer active'
        const uoms = linkedUoms(product)
        if (!draft.uomId) errors.uomId = 'Select a UOM'
        else if (!uoms.some(u => u.uom_id === draft.uomId)) errors.uomId = 'Select a UOM linked to this item'
      }
    }
    const qty = Number(draft.quantity)
    if (!Number.isFinite(qty) || qty <= 0) errors.quantity = 'Enter a quantity greater than zero'
    const cost = parseOptionalCost(draft.unitCost)
    if (Number.isNaN(cost)) errors.unitCost = 'Enter a valid non-negative cost'
    if (Object.keys(errors).length > 0) lineErrors[draft.key] = errors
  }
  return { headerErrors, lineErrors }
}

export async function postReceipt(
  input: {
    locationId: string
    supplierId: string | null
    deliveryReference: string
    receiptDate: string
    notes: string
    idempotencyKey: string
    lines: Array<{ productId: string; uomId: string; quantity: number; unitCost: number | null; lineValue: number | null }>
  },
  fetcher: ReceiptFetch = fetch,
): Promise<PostedReceipt> {
  const response = await fetcher('/api/inventory/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location_id: input.locationId,
      supplier_id: input.supplierId || null,
      delivery_reference: input.deliveryReference.trim() || null,
      receipt_date: input.receiptDate || null,
      notes: input.notes.trim() || null,
      idempotency_key: input.idempotencyKey,
      lines: input.lines.map(line => ({
        product_id: line.productId,
        uom_id: line.uomId,
        quantity: line.quantity,
        unit_cost: line.unitCost,
        line_value: line.lineValue,
      })),
    }),
  })
  let body: { data?: PostedReceipt; error?: { message?: string } }
  try {
    body = await response.json() as { data?: PostedReceipt; error?: { message?: string } }
  } catch {
    throw new Error('Could not post the receipt')
  }
  if (!response.ok || body.error) throw new Error(body.error?.message || 'Could not post the receipt')
  if (!body.data) throw new Error('The receipt completed without a record')
  return body.data
}

export async function quickCreateProduct(
  input: QuickProductInput,
  fetcher: ReceiptFetch = fetch,
): Promise<InventoryProduct> {
  const response = await fetcher('/api/inventory/products/quick-create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name.trim(),
      sku: input.sku.trim() || null,
      barcode: input.barcode.trim() || null,
      category_id: input.categoryId || null,
      inventory_type: input.inventoryType || null,
      supplier_id: input.supplierId || null,
      unit_cost: parseOptionalCost(input.unitCost),
      base_uom_id: input.baseUomId,
    }),
  })
  let body: { data?: InventoryProduct; error?: { message?: string } }
  try {
    body = await response.json() as { data?: InventoryProduct; error?: { message?: string } }
  } catch {
    throw new Error('Could not create the item')
  }
  if (!response.ok || body.error) throw new Error(body.error?.message || 'Could not create the item')
  if (!body.data) throw new Error('The item was created without a record')
  return body.data
}

export async function loadReceiptReferences(fetcher: ReceiptFetch = fetch): Promise<{
  products: InventoryProduct[]
  locations: InventoryLocation[]
  categories: Array<{ id: string; name: string }>
  suppliers: Array<{ id: string; name: string }>
  uoms: Array<{ id: string; name: string; symbol: string | null }>
}> {
  const [productsRes, locationsRes, categoriesRes, suppliersRes, uomsRes] = await Promise.all([
    fetcher('/api/inventory/products?page_size=500&include_balance=false'),
    fetcher('/api/inventory/locations?page_size=100'),
    fetcher('/api/inventory/categories'),
    fetcher('/api/inventory/suppliers?page_size=200'),
    fetcher('/api/inventory/uoms'),
  ])

  const read = async <T>(response: Response, fallback: string): Promise<T[]> => {
    let body: { data?: T[]; error?: { message?: string } }
    try {
      body = await response.json() as { data?: T[]; error?: { message?: string } }
    } catch {
      throw new Error(fallback)
    }
    if (!response.ok || body.error) throw new Error(body.error?.message || fallback)
    return body.data ?? []
  }

  const [products, locations, categories, suppliers, uoms] = await Promise.all([
    read<InventoryProduct>(productsRes, 'Could not load items'),
    read<InventoryLocation>(locationsRes, 'Could not load locations'),
    read<{ id: string; name: string; children?: unknown[] }>(categoriesRes, 'Could not load categories'),
    read<{ id: string; name: string; is_active?: boolean }>(suppliersRes, 'Could not load suppliers'),
    read<{ id: string; name: string; symbol: string | null }>(uomsRes, 'Could not load units'),
  ])

  const flatCategories: Array<{ id: string; name: string }> = []
  const walk = (nodes: Array<{ id: string; name: string; children?: unknown[] }>) => {
    for (const node of nodes) {
      flatCategories.push({ id: node.id, name: node.name })
      if (Array.isArray(node.children)) walk(node.children as Array<{ id: string; name: string; children?: unknown[] }>)
    }
  }
  walk(categories)

  return {
    products: products.filter(p => p.is_active && p.deleted_at == null),
    locations: locations.filter(l => l.is_active && l.deleted_at == null),
    categories: flatCategories,
    suppliers: suppliers.filter(s => s.is_active !== false),
    uoms,
  }
}
