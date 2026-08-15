import { describe, it, expect, vi, beforeEach } from 'vitest'
import { receiveItems } from '../engine/purchase-orders'
import { computeDueDate } from '../engine/payment-terms'

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
let mockInsertErrors: Record<string, { code: string }> = {}
let mockSupplierTerm: { payment_term_type: string | null; payment_term_days: number | null }

function poRow(status: string) {
  return { id: poId, status, supplier_id: 'sup-1' }
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
    mockInsertErrors = {}
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
          const insertErr = mockInsertErrors[table]
          if (insertErr) {
            return Promise.resolve({ data: null, error: { message: insertErr.code, code: insertErr.code } })
          }
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
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5, shortage_reason: 'SUPPLIER_SHORTAGE' }],
      received_by_admin_id: 'adm-1',
      received_by_admin_name: 'Mr Test Admin',
    })

    expect(mockReceiptInserts.length).toBe(3)
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
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5, shortage_reason: 'SUPPLIER_SHORTAGE' }],
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
    expect(mockReceiptInserts.length).toBe(3)
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    const txnInput = mockCreateTransaction.mock.calls[0]?.[0] as Record<string, unknown> | undefined
    expect(txnInput?.quantity).toBe(10)
  })

  it('accumulates multiple lines for the same PO item against the cap (P1b)', async () => {
    await expect(
      receiveItems(poId, {
        items: [
          { po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 6, shortage_reason: 'BACKORDER' },
          { po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 5 },
        ],
      }),
    ).rejects.toThrow('Cannot receive more than the outstanding quantity. Outstanding: 4, requested: 5')
    expect(mockReceiptInserts.length).toBe(0)
  })

  it('stores the shortage reason on a short delivery (P1c)', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8, shortage_reason: 'SUPPLIER_SHORTAGE' }],
      received_by_admin_id: 'adm-1',
      received_by_admin_name: 'Mr Test Admin',
    })
    const riInsert = mockReceiptInserts.find(i => i.table === 'inventory_po_receipt_items')
    expect(riInsert?.payload.shortage_reason).toBe('SUPPLIER_SHORTAGE')
    expect(riInsert?.payload.shortage_notes).toBeNull()
    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
  })

  it('stores OTHER notes alongside the reason (P1c)', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8, shortage_reason: 'OTHER', shortage_notes: 'box torn in transit' }],
    })
    const riInsert = mockReceiptInserts.find(i => i.table === 'inventory_po_receipt_items')
    expect(riInsert?.payload.shortage_reason).toBe('OTHER')
    expect(riInsert?.payload.shortage_notes).toBe('box torn in transit')
  })

  it('requires a shortage reason when receiving less than outstanding (P1c)', async () => {
    await expect(
      receiveItems(poId, { items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8 }] }),
    ).rejects.toThrow('A shortage reason is required when receiving less than the outstanding quantity')
    expect(mockReceiptInserts.length).toBe(0)
    expect(mockCreateTransaction).not.toHaveBeenCalled()
  })

  it('does not require a reason when receiving exactly the outstanding quantity (P1c)', async () => {
    await receiveItems(poId, { items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }] })
    const riInsert = mockReceiptInserts.find(i => i.table === 'inventory_po_receipt_items')
    expect(riInsert?.payload.shortage_reason).toBeNull()
  })

  it('rejects an invalid shortage reason value (P1c)', async () => {
    await expect(
      receiveItems(poId, {
        items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8, shortage_reason: 'BOGUS' as any }],
      }),
    ).rejects.toThrow('Invalid shortage reason: BOGUS. Must be one of SUPPLIER_SHORTAGE, BACKORDER, DAMAGED, RETURNED, OTHER')
    expect(mockReceiptInserts.length).toBe(0)
  })
})

describe('receiveItems auto supplier invoice (P1d)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateTransaction.mockResolvedValue({ id: 'txn-1' })
    mockReceiptInserts.length = 0
    mockInsertErrors = {}
    mockSupplierTerm = { payment_term_type: 'CASH', payment_term_days: null }
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
        inventory_purchase_order_items: [poItemRow()],
        [receiptsTable]: { id: 'rec-1' },
        inventory_suppliers: mockSupplierTerm,
      }

      const getResult = () => {
        if (insertPayload !== null) {
          const insertErr = mockInsertErrors[table]
          if (insertErr) {
            return Promise.resolve({ data: null, error: { message: insertErr.code, code: insertErr.code } })
          }
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

  const invoiceInserts = () =>
    mockReceiptInserts.filter(i => i.table === 'inventory_supplier_invoices').map(i => i.payload)

  it('auto-creates the supplier invoice from received quantities only', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8, shortage_reason: 'SUPPLIER_SHORTAGE' }],
      invoice_number: 'P1D-TEST-001',
      received_by_admin_id: 'adm-1',
      received_by_admin_name: 'Mr Test Admin',
    })

    const invoices = invoiceInserts()
    expect(invoices.length).toBe(1)
    const inv = invoices[0]!
    expect(inv.supplier_id).toBe('sup-1')
    expect(inv.receipt_id).toBe('rec-1')
    expect(inv.invoice_number).toBe('P1D-TEST-001')
    expect(inv.total_amount).toBe(400) // 8 x 50 (PO item cost), never the ordered 10
    expect(inv.status).toBe('pending')
    expect(inv.notes).toBe('Auto-created from PO receipt')
    expect(inv.invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(inv.created_by).toBeNull()
  })

  it('partial receipts create one invoice per receipt with its own amount', async () => {
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 8, shortage_reason: 'BACKORDER' }],
      invoice_number: 'INV-A',
    })
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 2, shortage_reason: 'SUPPLIER_SHORTAGE' }],
      invoice_number: 'INV-B',
    })

    const invoices = invoiceInserts()
    expect(invoices.length).toBe(2)
    expect(invoices.map(i => i.invoice_number)).toEqual(['INV-A', 'INV-B'])
    expect(invoices.map(i => i.total_amount)).toEqual([400, 100]) // 8x50 then 2x50
  })

  it('never creates a duplicate invoice for the same receipt (23505 swallowed)', async () => {
    mockInsertErrors['inventory_supplier_invoices'] = { code: '23505' }

    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
      invoice_number: 'INV-C',
    })

    expect(mockCreateTransaction).toHaveBeenCalledTimes(1)
    expect(invoiceInserts().length).toBe(0) // the failed insert is not retried as a new invoice
    const riInsert = mockReceiptInserts.find(i => i.table === 'inventory_po_receipt_items')
    expect(riInsert?.payload.quantity_received).toBe(10)
  })

  it('computes the due date from the supplier term (MONTHLY -> same day next month)', async () => {
    mockSupplierTerm = { payment_term_type: 'MONTHLY', payment_term_days: null }
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
      invoice_number: 'INV-M',
    })
    const inv = invoiceInserts()[0]!
    const expected = computeDueDate(new Date().toISOString().slice(0, 10), 'MONTHLY', null)
    expect(inv.due_date).toBe(expected)
    expect(inv.invoice_date).toBe(new Date().toISOString().slice(0, 10))
  })

  it('computes the due date for ACCOUNT with custom days', async () => {
    mockSupplierTerm = { payment_term_type: 'ACCOUNT', payment_term_days: 30 }
    await receiveItems(poId, {
      items: [{ po_item_id: 'poi-1', product_id: 'prod-1', quantity_received: 10 }],
      invoice_number: 'INV-A30',
    })
    const inv = invoiceInserts()[0]!
    const expected = computeDueDate(new Date().toISOString().slice(0, 10), 'ACCOUNT', 30)
    expect(inv.due_date).toBe(expected)
  })
})