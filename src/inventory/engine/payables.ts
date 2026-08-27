// Supplier payables — invoice capture, payment recording and per-supplier
// outstanding balances, backed by inventory_supplier_invoices /
// inventory_supplier_payments (migration 064).

import { getInventoryClient } from '../lib/db'
import { writeAuditLog } from '../lib/audit'
import { getOwnerRange } from './owner-dashboard'
import { deriveDueDate, daysUntilDue, PAYMENT_TERM_LABELS } from './payment-terms'

export interface PayableRow {
  supplierId: string
  supplierName: string
  week: number
  month: number
  outstanding: number
  openInvoiceCount: number
  lastInvoiceDate: string | null
  lastInvoiceAmount: number
  lastPaymentDate: string | null
  lastPaymentAmount: number
  paymentTerms: string | null
  nextDueDate: string | null
  daysToDue: number | null
  status: 'paid' | 'partial' | 'outstanding' | 'overdue'
}

export interface SupplierPayResult {
  rows: PayableRow[]
  totalOutstanding: number
  weekTotal: number
  monthTotal: number
  enabled: boolean
}

interface InvoiceRow {
  id: string
  supplier_id: string
  invoice_date: string | null
  due_date: string | null
  total_amount: number
  status: string
}

interface PaymentRow {
  invoice_id: string
  amount: number
  paid_at: string
}

interface PaidInfo {
  total: number
  lastDate: string | null
  lastAmount: number
}

const OPEN_STATUSES = new Set(['pending', 'partial', 'overdue'])

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function getSupplierPayables(): Promise<SupplierPayResult> {
  const supabase = getInventoryClient()
  const { data: suppliers, error: suppliersError } = await supabase
      .from('inventory_suppliers')
      .select('id, name, payment_term_type, payment_term_days')
      .eq('is_active', true)
      .order('name')
    if (suppliersError) throw new Error(`Failed to load suppliers: ${suppliersError.message}`)
    const roster = (suppliers ?? []) as unknown as Array<{ id: string; name: string; payment_term_type: string | null; payment_term_days: number | null }>

    const week = getOwnerRange('this_week')
    const month = getOwnerRange('this_month')

    const { data: invoices, error: invoicesError } = await supabase
      .from('inventory_supplier_invoices')
      .select('id, supplier_id, invoice_date, due_date, total_amount, status')
    const { data: payments, error: paymentsError } = await supabase
      .from('inventory_supplier_payments')
      .select('invoice_id, amount, paid_at')
    if (invoicesError) throw new Error(`Failed to load supplier invoices: ${invoicesError.message}`)
    if (paymentsError) throw new Error(`Failed to load supplier payments: ${paymentsError.message}`)

    const invRows = (invoices ?? []) as unknown as InvoiceRow[]
    const payRows = (payments ?? []) as unknown as PaymentRow[]

    // Invoice grouping per supplier + payment rollups per invoice
    const bySupplier = new Map<string, InvoiceRow[]>()
    for (const inv of invRows) {
      const list = bySupplier.get(inv.supplier_id) ?? []
      list.push(inv)
      bySupplier.set(inv.supplier_id, list)
    }

    const paidByInvoice = new Map<string, PaidInfo>()
    for (const p of payRows) {
      const cur = paidByInvoice.get(p.invoice_id) ?? { total: 0, lastDate: null, lastAmount: 0 }
      cur.total += Number(p.amount) || 0
      if (!cur.lastDate || p.paid_at > cur.lastDate) {
        cur.lastDate = p.paid_at
        cur.lastAmount = Number(p.amount) || 0
      }
      paidByInvoice.set(p.invoice_id, cur)
    }

    const rows: PayableRow[] = []
    let totalOutstanding = 0
    let weekTotal = 0
    let monthTotal = 0
    const today = new Date().toISOString().slice(0, 10)

    for (const sup of roster) {
      const invs = bySupplier.get(sup.id) ?? []
      let weekAmt = 0
      let monthAmt = 0
      let outstanding = 0
      let openCount = 0
      let invoicePaidTotal = 0
      let lastInvoice: InvoiceRow | null = null
      let lastPayDate: string | null = null
      let lastPayAmount = 0
      // P1e: read-time overdue — computed from each open invoice's due date
      // (stored when auto-created, derived from the supplier's term for
      // historical invoices). No scheduler, no background job.
      let anyOverdue = false
      let nextDue: { date: string; days: number } | null = null

      for (const inv of invs) {
        const d = inv.invoice_date ?? ''
        if (d >= week.start.slice(0, 10) && d < week.end.slice(0, 10)) weekAmt += Number(inv.total_amount) || 0
        if (d >= month.start.slice(0, 10) && d < month.end.slice(0, 10)) monthAmt += Number(inv.total_amount) || 0

        if (!lastInvoice || (inv.invoice_date ?? '') > (lastInvoice.invoice_date ?? '')) lastInvoice = inv

        const paid = paidByInvoice.get(inv.id)?.total ?? 0
        if (OPEN_STATUSES.has((inv.status || '').toLowerCase())) {
          openCount += 1
          invoicePaidTotal += paid
          const open = Number(inv.total_amount) - paid
          if (open > 0.004) {
            outstanding += open
            const due = inv.due_date ?? deriveDueDate(inv.invoice_date, sup.payment_term_type, sup.payment_term_days)
            const days = daysUntilDue(due, today)
            if (days !== null && days < 0) anyOverdue = true
            if (due && (!nextDue || due < nextDue.date)) {
              nextDue = { date: due, days: days ?? 0 }
            }
          }
        }
        if (paid > 0 && (!lastPayDate || (paidByInvoice.get(inv.id)?.lastDate ?? '') > lastPayDate)) {
          const info = paidByInvoice.get(inv.id)
          if (info?.lastDate) {
            lastPayDate = info.lastDate
            lastPayAmount = info.lastAmount
          }
        }
      }

      let status: PayableRow['status']
      if (invs.some(i => (i.status || '').toLowerCase() === 'overdue') || anyOverdue) status = 'overdue'
      else if (outstanding > 0.004) status = invoicePaidTotal > 0 ? 'partial' : 'outstanding'
      else status = 'paid'

      totalOutstanding += outstanding
      weekTotal += weekAmt
      monthTotal += monthAmt
      rows.push({
        supplierId: sup.id,
        supplierName: sup.name,
        week: round2(weekAmt),
        month: round2(monthAmt),
        outstanding: round2(outstanding),
        openInvoiceCount: openCount,
        lastInvoiceDate: lastInvoice?.invoice_date ?? null,
        lastInvoiceAmount: lastInvoice ? round2(Number(lastInvoice.total_amount) || 0) : 0,
        lastPaymentDate: lastPayDate,
        lastPaymentAmount: round2(lastPayAmount),
        paymentTerms: sup.payment_term_type ? PAYMENT_TERM_LABELS[sup.payment_term_type] ?? sup.payment_term_type : null,
        nextDueDate: nextDue?.date ?? null,
        daysToDue: nextDue?.days ?? null,
        status,
      })
    }

  return {
      rows,
      totalOutstanding: round2(totalOutstanding),
      weekTotal: round2(weekTotal),
      monthTotal: round2(monthTotal),
      enabled: true,
  }
}

export async function captureSupplierInvoice(input: {
  supplierId: string
  invoiceNumber?: string | null
  invoiceDate: string
  totalAmount: number
  notes?: string | null
  capturedBy?: string | null
}): Promise<{ id: string }> {
  const supabase = getInventoryClient()
  const { data, error } = await supabase
    .from('inventory_supplier_invoices')
    .insert({
      supplier_id: input.supplierId,
      invoice_number: input.invoiceNumber ?? null,
      invoice_date: input.invoiceDate,
      total_amount: input.totalAmount,
      status: 'pending',
      notes: input.notes ?? null,
      created_by: input.capturedBy ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to capture invoice: ${error.message}`)
  const id = (data as unknown as { id: string }).id
  await writeAuditLog('inventory_supplier_invoices', id, 'created', {
    supplier_id: input.supplierId,
    invoice_number: input.invoiceNumber ?? null,
    invoice_date: input.invoiceDate,
    total_amount: input.totalAmount,
    notes: input.notes ?? null,
  }, input.capturedBy ?? null)
  return { id }
}

export async function recordSupplierPayment(input: {
  invoiceId?: string | null
  supplierId?: string | null
  amount: number
  paidAt: string
  recordedBy?: string | null
  method?: string | null
  reference?: string | null
  notes?: string | null
  idempotencyKey?: string | null
}): Promise<{ id: string; invoice_id: string; status: string; already_recorded?: boolean }> {
  const supabase = getInventoryClient()
  if (!(input.amount > 0)) throw new Error('Payment amount must be positive')

  const { data, error } = await supabase.rpc('record_supplier_payment', {
    p_invoice_id: input.invoiceId ?? null,
    p_supplier_id: input.supplierId ?? null,
    p_amount: input.amount,
    p_paid_at: input.paidAt,
    p_recorded_by_admin_id: input.recordedBy ?? null,
    p_method: input.method ?? 'EFT',
    p_reference: input.reference ?? null,
    p_notes: input.notes ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
  })

  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to record payment atomically: no result returned')
  }
  return data as { id: string; invoice_id: string; status: string; already_recorded?: boolean }
}
