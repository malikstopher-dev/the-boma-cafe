import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPurchaseOrder, updatePurchaseOrder, listPurchaseOrders, receiveItems } from '../engine/purchase-orders'

const mockClient = {
  from: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

const { mockResolveCostCentre } = vi.hoisted(() => ({
  mockResolveCostCentre: vi.fn(),
}))

vi.mock('../lib/cost-centre', () => ({
  resolveCostCentreId: mockResolveCostCentre,
}))

const { mockCreateTransaction } = vi.hoisted(() => ({
  mockCreateTransaction: vi.fn(),
}))

vi.mock('../engine/ledger', () => ({
  createTransaction: mockCreateTransaction,
}))

vi.mock('../lib/audit', () => ({
  writeAuditLog: vi.fn(() => Promise.resolve()),
}))

let insertPayloads: Array<{ table: string; payload: Record<string, unknown> }> = []
let updatePayloads: Array<{ table: string; payload: Record<string, unknown> }> = []
let eqCalls: Array<{ table: string; column: string; value: unknown }> = []
let poRowOverride: Record<string, unknown> | null = null

function poRow() {
  return {
    id: 'po-1',
    status: 'ordered',
    supplier_id: 'sup-1',
    booking_id: null,
    cost_centre_id: null,
    ...(poRowOverride ?? {}),
  }
}

function poItemRow() {
  return {
    id: 'poi-1',
    product_id: 'prod-1',
    location_id: 'loc-1',
    quantity_ordered: 10,
    quantity_received: 0,
    unit_cost: 50,
  }
}

function makeDispatch() {
  mockClient.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {}
    let insertPayload: unknown = null
    let updatePayload: unknown = null
    let mode: 'select' | 'insert' | 'update' = 'select'
    chain.insert = (p: unknown) => { mode = 'insert'; insertPayload = p; return chain }
    chain.update = (p: unknown) => { mode = 'update'; updatePayload = p; return chain }
    chain.select = () => chain
    chain.order = () => chain
    chain.limit = () => chain
    chain.eq = (column: string, value: unknown) => { eqCalls.push({ table, column, value }); return chain }
    chain.is = () => chain
    chain.in = () => chain
    chain.lt = () => chain

    const rowsByTable: Record<string, unknown> = {
      inventory_purchase_orders: poRow(),
      inventory_purchase_order_items: [poItemRow()],
      inventory_po_receipts: { id: 'rec-1' },
      inventory_suppliers: { payment_term_type: 'CASH', payment_term_days: null },
    }

    const getResult = () => {
      if (insertPayload !== null) {
        insertPayloads.push({ table, payload: (insertPayload as Record<string, unknown>) ?? {} })
        return Promise.resolve({ data: { id: 'rec-1' }, error: null })
      }
      if (updatePayload !== null) {
        updatePayloads.push({ table, payload: (updatePayload as Record<string, unknown>) ?? {} })
        return Promise.resolve({ data: null, error: null })
      }
      return Promise.resolve({ data: rowsByTable[table] ?? null, error: null })
    }

    chain.single = () => getResult()
    chain.maybeSingle = () => getResult()
    chain.then = (onF: (v: unknown) => unknown) => getResult().then(onF)
    return chain
  })
}

describe('E4 event-attributed purchase orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveCostCentre.mockResolvedValue('cc-resolved')
    mockCreateTransaction.mockResolvedValue({ id: 'txn-1' })
    insertPayloads = []
    updatePayloads = []
    eqCalls = []
    poRowOverride = null
    makeDispatch()
  })

  it('stores booking_id and cost_centre_id on the PO when provided', async () => {
    await createPurchaseOrder({
      supplier_id: 'sup-1',
      booking_id: 'bk-1',
      cost_centre_id: 'cc-events',
      items: [{ product_id: 'prod-1', location_id: 'loc-1', quantity_ordered: 5 }],
    })

    const poInsert = insertPayloads.find(i => i.table === 'inventory_purchase_orders')
    expect(poInsert?.payload.booking_id).toBe('bk-1')
    expect(poInsert?.payload.cost_centre_id).toBe('cc-events')
  })

  it('stores nulls for both when absent (plain replenishment, backward compatible)', async () => {
    await createPurchaseOrder({
      supplier_id: 'sup-1',
      items: [{ product_id: 'prod-1', location_id: 'loc-1', quantity_ordered: 5 }],
    })

    const poInsert = insertPayloads.find(i => i.table === 'inventory_purchase_orders')
    expect(poInsert?.payload.booking_id).toBeNull()
    expect(poInsert?.payload.cost_centre_id).toBeNull()
  })

  it('updatePurchaseOrder accepts booking_id and cost_centre_id', async () => {
    await updatePurchaseOrder('po-1', { booking_id: 'bk-1', cost_centre_id: 'cc-events' })

    const poUpdate = updatePayloads.find(i => i.table === 'inventory_purchase_orders')
    expect(poUpdate?.payload.booking_id).toBe('bk-1')
    expect(poUpdate?.payload.cost_centre_id).toBe('cc-events')
  })

  it('listPurchaseOrders filters by booking_id', async () => {
    await listPurchaseOrders({ booking_id: 'bk-1' })

    const bookingFilter = eqCalls.find(c => c.table === 'inventory_purchase_orders' && c.column === 'booking_id')
    expect(bookingFilter?.value).toBe('bk-1')
  })

  it('receiveItems costs to the PO cost centre when no explicit override (E4 precedence #2)', async () => {
    poRowOverride = { booking_id: 'bk-1', cost_centre_id: 'cc-events' }

    await receiveItems('po-1', {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
    })

    expect(mockResolveCostCentre).toHaveBeenCalledWith('loc-1', 'cc-events')
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
  })

  it('receiveItems lets an explicit receive-time override beat the PO centre (E4 precedence #1)', async () => {
    poRowOverride = { cost_centre_id: 'cc-events' }

    await receiveItems('po-1', {
      cost_centre_id: 'cc-other',
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
    })

    expect(mockResolveCostCentre).toHaveBeenCalledWith('loc-1', 'cc-other')
  })

  it('receiveItems falls back to the location when the PO has no cost centre (unchanged)', async () => {
    await receiveItems('po-1', {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
    })

    expect(mockResolveCostCentre).toHaveBeenCalledWith('loc-1', null)
  })
})
