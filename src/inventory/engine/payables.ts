// Supplier payables — invoice capture, payment recording and per-supplier
// outstanding balances, backed by inventory_supplier_invoices /
// inventory_supplier_payments (migration 064).

import { getInventoryClient } from '../lib/db'
import { writeAuditLog } from '../lib/audit'
import { getOwnerRange } from './owner-dashboard'

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
  try {
    const { data: suppliers } = await supabase
      .from('inventory_suppliers')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    const roster = (suppliers ?? []) as unknown as Array<{ id: string; name: string }>

    const week = getOwnerRange('this_week')
    const month = getOwnerRange('this_month')

    const { data: invoices } = await supabase
      .from('inventory_supplier_invoices')
      .select('id, supplier_id, invoice_date, total_amount, status')
    const { data: payments } = await supabase
      .from('inventory_supplier_payments')
      .select('invoice_id, amount, paid_at')

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
          if (open > 0.004) outstanding += open
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
      if (invs.some(i => (i.status || '').toLowerCase() === 'overdue')) status = 'overdue'
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
  } catch {
    // Tables don't exist — degrade gracefully
    return { rows: [], totalOutstanding: 0, weekTotal: 0, monthTotal: 0, enabled: false }
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
}): Promise<{ id: string; status: string }> {
  const supabase = getInventoryClient()
  if (!(input.amount > 0)) throw new Error('Payment amount must be positive')

  let invoiceId: string | null = input.invoiceId ?? null
  if (!invoiceId) {
    if (!input.supplierId) throw new Error('Either invoiceId or supplierId is required')
    const { data: open } = await supabase
      .from('inventory_supplier_invoices')
      .select('id')
      .eq('supplier_id', input.supplierId)
      .in('status', ['pending', 'partial', 'overdue'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!open) throw new Error('This supplier has no open invoices to pay against')
    invoiceId = (open as unknown as { id: string }).id
  }

  const { data: invoice } = await supabase
    .from('inventory_supplier_invoices')
    .select('id, total_amount, status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) throw new Error('Invoice not found')
  const total = Number((invoice as unknown as { total_amount: number }).total_amount) || 0

  const { data: existing } = await supabase
    .from('inventory_supplier_payments')
    .select('amount')
    .eq('invoice_id', invoiceId)
  const alreadyPaid = (existing ?? []).reduce((s: number, r: unknown) => s + (Number((r as { amount: number }).amount) || 0), 0)
  const newStatus = alreadyPaid + input.amount >= total - 0.004 ? 'paid' : 'partial'

  const { data: payment, error } = await supabase
    .from('inventory_supplier_payments')
    .insert({
      invoice_id: invoiceId,
      amount: input.amount,
      paid_at: input.paidAt,
      created_by: input.recordedBy ?? null,
    })
    .select('id')
    .single()
  if (error) throw new Error(`Failed to record payment: ${error.message}`)
  const id = (payment as { id?: string } | null)?.id
  if (!id) throw new Error('Failed to record payment: no id returned')

  await supabase.from('inventory_supplier_invoices').update({ status: newStatus }).eq('id', invoiceId)
  await writeAuditLog('inventory_supplier_payments', id, 'created', {
    invoice_id: invoiceId,
    amount: input.amount,
    paid_at: input.paidAt,
  }, input.recordedBy ?? null)
  return { id, status: newStatus }
}
