import { getInventoryClient } from '../lib/db'
import { createTransaction } from './ledger'
import { writeAuditLog } from '../lib/audit'
import type { CreateTransactionInput } from './types'

export type PoStatus = 'draft' | 'approved' | 'ordered' | 'partial' | 'received' | 'cancelled'

export interface CreatePoInput {
  supplier_id: string
  quotation_ref?: string | null
  expected_at?: string | null
  notes?: string | null
  created_by?: string | null
  items: {
    product_id: string
    location_id: string
    quantity_ordered: number
    unit_cost?: number | null
  }[]
}

export interface ReceiveInput {
  invoice_number?: string | null
  notes?: string | null
  received_by?: string | null
  items: {
    po_item_id: string
    product_id: string
    quantity_received: number
    unit_cost?: number | null
  }[]
}

export async function createPurchaseOrder(input: CreatePoInput) {
  const supabase = getInventoryClient()

  if (!input.items || input.items.length === 0) {
    throw new Error('Purchase order must have at least one item')
  }

  const { data: po, error: poError } = await supabase
    .from('inventory_purchase_orders')
    .insert({
      supplier_id: input.supplier_id,
      quotation_ref: input.quotation_ref ?? null,
      expected_at: input.expected_at ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single()

  if (poError) throw new Error(`Failed to create PO: ${poError.message}`)

  const poId = po.id

  const poItems = input.items.map((item) => ({
    po_id: poId,
    product_id: item.product_id,
    location_id: item.location_id,
    quantity_ordered: item.quantity_ordered,
    unit_cost: item.unit_cost ?? null,
  }))

  const { error: itemsError } = await supabase
    .from('inventory_purchase_order_items')
    .insert(poItems)

  if (itemsError) {
    await supabase.from('inventory_purchase_orders').delete().eq('id', poId)
    throw new Error(`Failed to create PO items: ${itemsError.message}`)
  }

  const { data: fullPo } = await supabase
    .from('inventory_purchase_orders')
    .select('*, inventory_purchase_order_items(*)')
    .eq('id', poId)
    .single()

  await writeAuditLog('inventory_purchase_orders', poId, 'created', { supplier_id: input.supplier_id }, input.created_by ?? null)

  return fullPo
}

export async function getPurchaseOrder(id: string) {
  const supabase = getInventoryClient()

  const { data: po } = await supabase
    .from('inventory_purchase_orders')
    .select('*, inventory_suppliers(name), inventory_purchase_order_items(*, inventory_products(id, name, sku))')
    .eq('id', id)
    .maybeSingle()

  if (!po) return null

  const { data: receipts } = await supabase
    .from('inventory_po_receipts')
    .select('*, inventory_po_receipt_items(*, inventory_products(id, name, sku))')
    .eq('po_id', id)
    .order('received_at', { ascending: false })

  return { ...po, receipts: receipts ?? [] }
}

export async function listPurchaseOrders(filters?: {
  supplier_id?: string
  status?: string
  overdue?: boolean
  inventory_type?: string
  limit?: number
}) {
  const supabase = getInventoryClient()

  let query = supabase
    .from('inventory_purchase_orders')
    .select('*, inventory_suppliers(name), inventory_purchase_order_items(count)')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 50)

  if (filters?.supplier_id) query = query.eq('supplier_id', filters.supplier_id)
  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.overdue) {
    query = query.in('status', ['ordered', 'partial'])
    query = query.lt('expected_at', new Date().toISOString().slice(0, 10))
  }

  if (filters?.inventory_type) {
    const { data: items } = await supabase
      .from('inventory_purchase_order_items')
      .select('purchase_order_id, inventory_products!inner(inventory_type)')
    const matching = new Set(
      (items ?? [])
        .filter(i => (i.inventory_products as { inventory_type?: string } | null)?.inventory_type === filters.inventory_type)
        .map(i => i.purchase_order_id),
    )
    if (matching.size === 0) return []
    query = query.in('id', [...matching])
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to list POs: ${error.message}`)

  return data ?? []
}

export async function updatePurchaseOrder(id: string, updates: Record<string, unknown>) {
  const supabase = getInventoryClient()

  const allowed = ['quotation_ref', 'expected_at', 'notes', 'supplier_id']
  const clean: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) clean[key] = updates[key]
  }

  clean.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .update(clean)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update PO: ${error.message}`)
  return data
}

export async function approvePurchaseOrder(id: string) {
  const result = await transitionStatus(id, 'approved')
  await writeAuditLog('inventory_purchase_orders', id, 'updated', { status: 'approved' })
  return result
}

export async function orderPurchaseOrder(id: string) {
  const supabase = getInventoryClient()

  const { data: po } = await supabase
    .from('inventory_purchase_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (!po) throw new Error('Purchase order not found')
  if (po.status !== 'approved') throw new Error(`Cannot order PO with status ${po.status}`)

  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .update({ status: 'ordered', ordered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to order PO: ${error.message}`)
  await writeAuditLog('inventory_purchase_orders', id, 'updated', { status: 'ordered' })
  return data
}

export async function receiveItems(poId: string, input: ReceiveInput) {
  const supabase = getInventoryClient()

  const { data: po } = await supabase
    .from('inventory_purchase_orders')
    .select('id, status')
    .eq('id', poId)
    .single()

  if (!po) throw new Error('Purchase order not found')
  if (!['ordered', 'partial'].includes(po.status)) {
    throw new Error(`Cannot receive items for PO with status ${po.status}`)
  }

  const { data: receipt, error: receiptError } = await supabase
    .from('inventory_po_receipts')
    .insert({
      po_id: poId,
      invoice_number: input.invoice_number ?? null,
      notes: input.notes ?? null,
      received_by: input.received_by ?? null,
    })
    .select()
    .single()

  if (receiptError) throw new Error(`Failed to create receipt: ${receiptError.message}`)
  if (!receipt) throw new Error('Failed to create receipt: no data returned')
  const receiptId = receipt.id

  const { data: poItemRows } = await supabase
    .from('inventory_purchase_order_items')
    .select('id, product_id, location_id, quantity_ordered, quantity_received, unit_cost')
    .eq('po_id', poId)

  const poItemsByKey = new Map((poItemRows ?? []).map(r => [`${r.id}::${r.product_id}`, r]))

  for (const item of input.items) {
    if (item.quantity_received <= 0) {
      throw new Error(`quantity_received must be positive, got ${item.quantity_received}`)
    }

    const key = `${item.po_item_id}::${item.product_id}`
    const poItem = poItemsByKey.get(key)
    if (!poItem) {
      throw new Error(`Item (po_item_id=${item.po_item_id}, product_id=${item.product_id}) does not belong to PO ${poId}`)
    }

    const { error: riError } = await supabase
      .from('inventory_po_receipt_items')
      .insert({
        receipt_id: receiptId,
        po_item_id: item.po_item_id,
        product_id: item.product_id,
        quantity_received: item.quantity_received,
        unit_cost: item.unit_cost ?? null,
      })

    if (riError) throw new Error(`Failed to record receipt item: ${riError.message}`)

    const unitCost = item.unit_cost ?? null

    await createTransaction({
      product_id: item.product_id,
      location_id: poItem.location_id,
      transaction_type: 'purchase',
      quantity: item.quantity_received,
      unit_cost: unitCost ?? undefined,
      reference_type: 'purchase_order',
      reference_id: poId,
      performed_by: input.received_by ?? null,
      notes: `PO receipt: ${input.invoice_number ?? 'no invoice'}`,
    } satisfies CreateTransactionInput)

    const newReceived = Number(poItem.quantity_received) + item.quantity_received
    await supabase
      .from('inventory_purchase_order_items')
      .update({ quantity_received: newReceived, unit_cost: item.unit_cost ?? poItem.unit_cost })
      .eq('id', item.po_item_id)
  }

  const allItems = await checkAllItemsReceived(poId)
  const newStatus = allItems ? 'received' : 'partial'

  const updateData: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() }
  if (newStatus === 'received') updateData.received_at = new Date().toISOString()

  await supabase.from('inventory_purchase_orders').update(updateData).eq('id', poId)

  return getPurchaseOrder(poId)
}

async function checkAllItemsReceived(poId: string): Promise<boolean> {
  const supabase = getInventoryClient()
  const { data: items } = await supabase
    .from('inventory_purchase_order_items')
    .select('quantity_ordered, quantity_received')
    .eq('po_id', poId)

  if (!items || items.length === 0) return false

  return items.every(item => Number(item.quantity_received) >= Number(item.quantity_ordered))
}

async function transitionStatus(id: string, targetStatus: PoStatus) {
  const supabase = getInventoryClient()

  const { data: po } = await supabase
    .from('inventory_purchase_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (!po) throw new Error('Purchase order not found')

  const validTransitions: Record<string, string[]> = {
    draft: ['approved', 'cancelled'],
    approved: ['ordered', 'cancelled'],
    ordered: ['partial', 'received', 'cancelled'],
    partial: ['received', 'cancelled'],
    received: [],
    cancelled: [],
  }

  const allowed = validTransitions[po.status] ?? []
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Cannot transition PO from ${po.status} to ${targetStatus}`)
  }

  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .update({ status: targetStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update PO status: ${error.message}`)
  return data
}

export async function cancelPurchaseOrder(id: string) {
  const result = await transitionStatus(id, 'cancelled')
  await writeAuditLog('inventory_purchase_orders', id, 'updated', { status: 'cancelled' })
  return result
}

export async function getReceiptsForPo(poId: string) {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_po_receipts')
    .select('*, inventory_po_receipt_items(*, inventory_products(id, name, sku))')
    .eq('po_id', poId)
    .order('received_at', { ascending: false })

  if (error) throw new Error(`Failed to get receipts: ${error.message}`)
  return data ?? []
}
