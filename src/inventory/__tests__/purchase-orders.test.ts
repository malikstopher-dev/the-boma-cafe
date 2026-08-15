import { describe, it, expect, vi, beforeEach } from 'vitest'
import { receiveItems } from '../engine/purchase-orders'

const mockClient = {
  from: vi.fn(),
}

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

vi.mock('../lib/cost-centre', () => ({
  resolveCostCentreId: vi.fn(() => Promise.resolve('cc-1')),
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

function ok<T>(data: T): Promise<{ data: T; error: null }> {
  return Promise.resolve({ data, error: null })
}

function err(msg: string): Promise<{ data: null; error: { message: string } }> {
  return Promise.resolve({ data: null, error: { message: msg } })
}

function chain(result: Promise<unknown>) {
  const c: Record<string, unknown> = {}
  c.select = () => c
  c.order = () => c
  c.eq = () => c
  c.is = () => c
  c.limit = () => c
  c.update = () => c
  c.insert = () => c
  c.single = () => result
  c.maybeSingle = () => result
  c.then = (onF: (v: unknown) => unknown) => result.then(onF)
  return c
}

const poId = 'po-1'
const receiptsTable = 'inventory_po_receipts'

function poRow(status: string) {
  return { id: poId, status }
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

describe('receiveItems admin identity (P1a)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateTransaction.mockResolvedValue({ id: 'txn-1' })
    mockReceiptInserts.length = 0
    // Table-dispatch: order-independent. insert/update calls capture their
    // payload via the chain's insert/update hooks.
    mockClient.from.mockImplementation((table: string) => {
      const chainObj: Record<string, unknown> = {}
      let insertPayload: unknown = null
      let mode: 'select' | 'insert' | 'update' = 'select'
      chainObj.insert = (p: unknown) => { mode = 'insert'; insertPayload = p; return chainObj }
      chainObj.update = (p: unknown) => { mode = 'update'; return chainObj }
      chainObj.select = () => chainObj
      chainObj.order = () => chainObj
      chainObj.eq = () => chainObj
      chainObj.is = () => chainObj
      chainObj.limit = () => chainObj

      const rowsByTable: Record<string, unknown> = {
        inventory_purchase_orders: poRow('ordered'),
        inventory_purchase_order_items: [poItemRow(), { quantity_ordered: 10, quantity_received: 5 }],
        [receiptsTable]: { id: 'rec-1' },
      }

      const getResult = () => {
        if (insertPayload !== null) {
          const inserted = (insertPayload as Record<string, unknown>) ?? {}
          mockReceiptInserts.push({ table, payload: inserted })
          return Promise.resolve({ data: { id: 'rec-1' }, error: null })
        }
        if (mode === 'update') {
          return Promise.resolve({ data: null, error: null })
        }
        return Promise.resolve({ data: rowsByTable[table] ?? null, error: null })
      }

      chainObj.single = () => getResult()
      chainObj.maybeSingle = () => getResult()
      chainObj.then = (onF: (v: unknown) => unknown) => getResult().then(onF)
      return chainObj
    })
  })

  const mockReceiptInserts: Array<{ table: string; payload: Record<string, unknown> }> = []

  it('stores the server-resolved admin identity on the receipt', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5 }],
      received_by_admin_id: 'adm-1',
      received_by_admin_name: 'Mr Test Admin',
    })

    expect(mockReceiptInserts.length).toBe(2)
    const receiptInsert = mockReceiptInserts.find(i => i.table === receiptsTable)!
    expect(receiptInsert.payload.received_by_admin_id).toBe('adm-1')
    expect(receiptInsert.payload.received_by_admin_name).toBe('Mr Test Admin')
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    const txnInput = mockCreateTransaction.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect(txnInput?.transaction_type).toBe('purchase')
    expect(txnInput?.quantity).toBe(5)
  })

  it('leaves the identity null when not provided (backward compatible)', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5 }],
    })

    const receiptInsert = mockReceiptInserts.find(i => i.table === receiptsTable)!
    expect(receiptInsert.payload.received_by_admin_id).toBeNull()
    expect(receiptInsert.payload.received_by_admin_name).toBeNull()
  })

  it('rejects a zero quantity with the unchanged validation message', async () => {
    await expect(
      receiveItems(poId, { items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 0 }] }),
    ).rejects.toThrow('quantity_received must be positive, got 0')
  })

  it('rejects an item that does not belong to the PO', async () => {
    await expect(
      receiveItems(poId, { items: [{ po_item_id: 'poi-2', product_id: 'prod-9', quantity_received: 5 }] }),
    ).rejects.toThrow('does not belong to PO')
  })

  it('rejects a receive above the outstanding quantity (P1b)', async () => {
    await expect(
      receiveItems(poId, { items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 11 }] }),
    ).rejects.toThrow('Cannot receive more than the outstanding quantity. Outstanding: 10, requested: 11')
    expect(mockReceiptInserts.length).toBe(0)
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('allows receiving exactly the outstanding quantity (P1b)', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
      received_by_admin_id: 'adm-1',
      received_by_admin_name: 'Mr Test Admin',
    })
    expect(mockReceiptInserts.length).toBe(2)
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    const txnInput = mockCreateTransaction.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect(txnInput?.quantity).toBe(10)
  })

  it('accumulates multiple lines for the same PO item against the cap (P1b)', async () => {
    await expect(
      receiveItems(poId, {
        items: [
          { po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 6 },
          { po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5 },
        ],
      }),
    ).rejects.toThrow('Cannot receive more than the outstanding quantity. Outstanding: 4, requested: 5')
    expect(mockReceiptInserts.length).toBe(0)
  })
})