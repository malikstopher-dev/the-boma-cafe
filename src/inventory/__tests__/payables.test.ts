import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupplierPayables, recordSupplierPayment } from '../engine/payables'
import { computeDueDate } from '../engine/payment-terms'

const mockClient = { from: vi.fn(), rpc: vi.fn() }

vi.mock('../lib/db', () => ({
  getInventoryClient: vi.fn(() => mockClient),
}))

vi.mock('../lib/audit', () => ({
  writeAuditLog: vi.fn(() => Promise.resolve()),
}))

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
const today = () => new Date().toISOString().slice(0, 10)

function setup(rows: { suppliers: unknown[]; invoices: unknown[]; payments?: unknown[] }) {
  mockClient.from.mockImplementation((table: string) => {
    const chainObj: Record<string, unknown> = {}
    chainObj.select = () => chainObj
    chainObj.order = () => chainObj
    chainObj.eq = () => chainObj
    chainObj.limit = () => chainObj
    chainObj.single = () => Promise.resolve({ data: null, error: null })
    const getResult = () => {
      if (table === 'inventory_suppliers') return Promise.resolve({ data: rows.suppliers, error: null })
      if (table === 'inventory_supplier_invoices') return Promise.resolve({ data: rows.invoices, error: null })
      if (table === 'inventory_supplier_payments') return Promise.resolve({ data: rows.payments ?? [], error: null })
      return Promise.resolve({ data: null, error: null })
    }
    chainObj.then = (onF: (v: unknown) => unknown) => getResult().then(onF)
    return chainObj
  })
}

function supplier(overrides: Record<string, unknown> = {}) {
  return { id: 'sup-1', name: 'Test Supplier', payment_term_type: 'CASH', payment_term_days: null, ...overrides }
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1', supplier_id: 'sup-1', invoice_date: today(), due_date: null,
    total_amount: 1000, status: 'pending', ...overrides,
  }
}

describe('getSupplierPayables read-time due dates (P1e)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('derives the due date from the supplier term when the invoice has none (MONTHLY)', async () => {
    setup({ suppliers: [supplier({ payment_term_type: 'MONTHLY' })], invoices: [invoice()] })
    const result = await getSupplierPayables()
    const row = result.rows[0]!
    expect(row.paymentTerms).toBe('Monthly')
    expect(row.nextDueDate).toBe(computeDueDate(today(), 'MONTHLY', null))
    expect(row.daysToDue).toBeGreaterThan(20)
    expect(row.status).toBe('outstanding')
  })

  it('marks a supplier overdue when an open invoice is past its due date (read-time)', async () => {
    setup({
      suppliers: [supplier({ payment_term_type: 'CASH' })],
      invoices: [invoice({ id: 'inv-old', invoice_date: daysAgo(10), due_date: daysAgo(10) })],
    })
    const result = await getSupplierPayables()
    const row = result.rows[0]!
    expect(row.nextDueDate).toBe(daysAgo(10))
    expect(row.daysToDue).toBe(-10)
    expect(row.status).toBe('overdue')
  })

  it('uses the stored due_date when present (auto-created invoices)', async () => {
    const due = computeDueDate(today(), 'ACCOUNT', 30)
    setup({
      suppliers: [supplier({ payment_term_type: 'ACCOUNT', payment_term_days: 30 })],
      invoices: [invoice({ due_date: due })],
    })
    const result = await getSupplierPayables()
    expect(result.rows[0]!.nextDueDate).toBe(due)
    expect(result.rows[0]!.daysToDue).toBe(30)
  })

  it('NULL term means due on the invoice date (legacy suppliers)', async () => {
    setup({ suppliers: [supplier({ payment_term_type: null })], invoices: [invoice()] })
    const row = (await getSupplierPayables()).rows[0]!
    expect(row.paymentTerms).toBeNull()
    expect(row.nextDueDate).toBe(today())
    expect(row.daysToDue).toBe(0)
  })

  it('does not mark a fully paid invoice overdue', async () => {
    setup({
      suppliers: [supplier({ payment_term_type: 'CASH' })],
      invoices: [invoice({ id: 'inv-paid', invoice_date: daysAgo(10), due_date: daysAgo(10), status: 'paid' })],
      payments: [{ invoice_id: 'inv-paid', amount: 1000, paid_at: new Date().toISOString() }],
    })
    const row = (await getSupplierPayables()).rows[0]!
    expect(row.status).toBe('paid')
    expect(row.daysToDue).toBeNull()
  })

  it('picks the earliest due date among open invoices', async () => {
    setup({
      suppliers: [supplier({ payment_term_type: 'WEEKLY' })],
      invoices: [
        invoice({ id: 'inv-a', invoice_date: today(), due_date: null }),
        invoice({ id: 'inv-b', invoice_date: daysAgo(3), due_date: null }),
      ],
    })
    const row = (await getSupplierPayables()).rows[0]!
    // inv-b was invoiced 3 days ago: WEEKLY due = 4 days from now < inv-a's 7
    expect(row.nextDueDate).toBe(computeDueDate(daysAgo(3), 'WEEKLY', null))
    expect(row.daysToDue).toBe(4)
  })
})

describe('recordSupplierPayment atomic contract', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('records through one RPC with admin attribution and idempotency', async () => {
    mockClient.rpc.mockResolvedValue({
      data: { id: 'pay-1', invoice_id: 'inv-1', status: 'partial', already_recorded: false },
      error: null,
    })

    const result = await recordSupplierPayment({
      invoiceId: 'inv-1',
      amount: 250,
      paidAt: '2026-08-26T12:00:00.000Z',
      recordedBy: 'admin-1',
      method: 'EFT',
      reference: 'BANK-1',
      idempotencyKey: 'payment-key-1',
    })

    expect(result).toMatchObject({ id: 'pay-1', status: 'partial' })
    expect(mockClient.rpc).toHaveBeenCalledTimes(1)
    expect(mockClient.rpc).toHaveBeenCalledWith('record_supplier_payment', {
      p_invoice_id: 'inv-1',
      p_supplier_id: null,
      p_amount: 250,
      p_paid_at: '2026-08-26T12:00:00.000Z',
      p_recorded_by_admin_id: 'admin-1',
      p_method: 'EFT',
      p_reference: 'BANK-1',
      p_notes: null,
      p_idempotency_key: 'payment-key-1',
    })
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('preserves an idempotent already-recorded response', async () => {
    mockClient.rpc.mockResolvedValue({
      data: { id: 'pay-1', invoice_id: 'inv-1', status: 'paid', already_recorded: true },
      error: null,
    })

    await expect(recordSupplierPayment({
      invoiceId: 'inv-1',
      amount: 250,
      paidAt: '2026-08-26T12:00:00.000Z',
      idempotencyKey: 'payment-key-1',
    })).resolves.toMatchObject({ already_recorded: true, status: 'paid' })
  })

  it('fails closed when the payment RPC rejects the write', async () => {
    mockClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Payment amount 500 exceeds remaining invoice balance 100' },
    })

    await expect(recordSupplierPayment({
      invoiceId: 'inv-1',
      amount: 500,
      paidAt: '2026-08-26T12:00:00.000Z',
    })).rejects.toThrow('exceeds remaining invoice balance')
    expect(mockClient.from).not.toHaveBeenCalled()
  })

  it('rejects non-positive payments before any database call', async () => {
    await expect(recordSupplierPayment({
      invoiceId: 'inv-1',
      amount: 0,
      paidAt: '2026-08-26T12:00:00.000Z',
    })).rejects.toThrow('Payment amount must be positive')
    expect(mockClient.rpc).not.toHaveBeenCalled()
  })
})
