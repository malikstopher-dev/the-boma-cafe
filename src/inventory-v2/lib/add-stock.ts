import type {
  InventoryLocation,
  InventoryProduct,
  InventoryProductUom,
  InventoryTransaction,
} from '@/inventory/engine/types'

export type AddStockFetch = (input: string, init?: RequestInit) => Promise<Response>
export const ADD_STOCK_REALTIME_EVENTS = ['stock.moved'] as const

export interface AddStockReferences {
  products: InventoryProduct[]
  locations: InventoryLocation[]
}

export interface AddStockPreview {
  sourceQuantity: number
  sourceUnitCost: number | null
  conversionFactor: number
  baseQuantity: number
  baseUnitCost: number | null
  currentBaseBalance: number
  projectedBaseBalance: number
  currentSourceBalance: number
  projectedSourceBalance: number
  receiptValue: number | null
}

export interface AddStockRequest {
  productId: string
  locationId: string
  uomId: string
  quantity: number
  unitCost: number | null
  notes: string | null
}

interface ApiEnvelope<T> {
  data?: T
  meta?: { cursor?: string | null; hasMore?: boolean }
  error?: { message?: string }
}

async function readJson<T>(response: Response, fallback: string): Promise<ApiEnvelope<T>> {
  let body: ApiEnvelope<T>
  try {
    body = await response.json() as ApiEnvelope<T>
  } catch {
    throw new Error(fallback)
  }
  if (!response.ok || body.error) throw new Error(body.error?.message || fallback)
  return body
}

async function loadAllProducts(fetcher: AddStockFetch): Promise<InventoryProduct[]> {
  const products: InventoryProduct[] = []
  let cursor: string | null = null

  do {
    const query = new URLSearchParams({ page_size: '500', include_balance: 'false' })
    if (cursor) query.set('cursor', cursor)
    const response = await fetcher(`/api/inventory/products?${query.toString()}`)
    const body = await readJson<InventoryProduct[]>(response, 'Could not load active items')
    products.push(...(body.data ?? []))
    cursor = body.meta?.hasMore ? body.meta.cursor ?? null : null
  } while (cursor)

  return products.filter(product => product.is_active && product.deleted_at == null)
}

export async function loadAddStockReferences(fetcher: AddStockFetch = fetch): Promise<AddStockReferences> {
  const [products, locationResponse] = await Promise.all([
    loadAllProducts(fetcher),
    fetcher('/api/inventory/locations?page_size=100'),
  ])
  const locationBody = await readJson<InventoryLocation[]>(locationResponse, 'Could not load active locations')
  const locations = (locationBody.data ?? []).filter(location => location.is_active && location.deleted_at == null)
  return { products, locations }
}

export async function loadAddStockProduct(
  productId: string,
  locationId: string,
  fetcher: AddStockFetch = fetch,
): Promise<InventoryProduct> {
  const response = await fetcher(
    `/api/inventory/products/${encodeURIComponent(productId)}?location_id=${encodeURIComponent(locationId)}`,
  )
  const body = await readJson<InventoryProduct>(response, 'Could not load the item balance')
  if (!body.data) throw new Error('Item details were not returned')
  return body.data
}

export function linkedUoms(product: InventoryProduct | null | undefined): InventoryProductUom[] {
  return (product?.inventory_product_uoms ?? [])
    .filter(link => Boolean(link.uom_id) && Number(link.conversion_factor) > 0)
    .sort((a, b) => Number(b.is_base) - Number(a.is_base) || Number(b.is_display) - Number(a.is_display))
}

export function uomLabel(link: InventoryProductUom | null | undefined): string {
  if (!link) return 'unit'
  const name = link.inventory_uoms?.name?.trim() || 'Unit'
  const symbol = link.inventory_uoms?.symbol?.trim()
  return symbol ? `${name} (${symbol})` : name
}

export function parseOptionalCost(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN
}

export function calculateAddStockPreview(
  currentBaseBalance: number,
  sourceQuantity: number,
  conversionFactor: number,
  sourceUnitCost: number | null,
): AddStockPreview {
  const factor = Number(conversionFactor)
  const quantity = Number(sourceQuantity)
  const current = Number(currentBaseBalance)
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('The selected UOM has an invalid conversion')
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Enter a quantity greater than zero')
  if (!Number.isFinite(current)) throw new Error('The current balance is unavailable')
  if (sourceUnitCost !== null && (!Number.isFinite(sourceUnitCost) || sourceUnitCost < 0)) {
    throw new Error('Enter a valid non-negative unit cost')
  }

  const baseQuantity = quantity * factor
  const baseUnitCost = sourceUnitCost === null ? null : sourceUnitCost / factor
  return {
    sourceQuantity: quantity,
    sourceUnitCost,
    conversionFactor: factor,
    baseQuantity,
    baseUnitCost,
    currentBaseBalance: current,
    projectedBaseBalance: current + baseQuantity,
    currentSourceBalance: current / factor,
    projectedSourceBalance: (current + baseQuantity) / factor,
    receiptValue: sourceUnitCost === null ? null : sourceUnitCost * quantity,
  }
}

export function validateAddStockRequest(input: Partial<AddStockRequest>): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!input.productId) errors.productId = 'Select an existing item'
  if (!input.locationId) errors.locationId = 'Select a receiving location'
  if (!input.uomId) errors.uomId = 'Select a valid item UOM'
  if (!Number.isFinite(input.quantity) || Number(input.quantity) <= 0) {
    errors.quantity = 'Enter a quantity greater than zero'
  }
  if (input.unitCost !== null && input.unitCost !== undefined && (!Number.isFinite(input.unitCost) || input.unitCost < 0)) {
    errors.unitCost = 'Enter a valid non-negative unit cost'
  }
  if ((input.notes?.length ?? 0) > 500) errors.notes = 'Notes must be 500 characters or fewer'
  return errors
}

export async function submitAddStock(
  input: AddStockRequest,
  fetcher: AddStockFetch = fetch,
): Promise<InventoryTransaction> {
  const errors = validateAddStockRequest(input)
  if (Object.keys(errors).length > 0) throw new Error(Object.values(errors)[0])

  const response = await fetcher('/api/inventory/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: input.productId,
      location_id: input.locationId,
      transaction_type: 'purchase',
      reason_type: 'DELIVERY',
      quantity: input.quantity,
      uom_id: input.uomId,
      unit_cost: input.unitCost,
      reason_notes: input.notes,
      notes: input.notes,
      reference_type: 'manual',
    }),
  })
  const body = await readJson<InventoryTransaction>(response, 'Could not add stock')
  if (!body.data) throw new Error('Receipt completed without a transaction record')
  return body.data
}

export function isLegacyAddStockRollback(search: string): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search
  return new URLSearchParams(query).get('add-stock') === 'legacy'
}
