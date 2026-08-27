'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  C, PageTitle, Card, Badge, Loading, Empty, ExportButton, Button, SearchBox, Field, TextInput, DateInput,
  DataTable, formatMoney, formatDate, exportCsv, type Column, type Tone,
} from '../kit'

type PayableRow = {
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

const STATUS_TONE: Record<PayableRow['status'], Tone> = {
  paid: 'good',
  partial: 'warning',
  outstanding: 'gold',
  overdue: 'danger',
}

export default function PayablesPage() {
  const [rows, setRows] = useState<PayableRow[]>([])
  const [sum, setSum] = useState({ totalOutstanding: 0, weekTotal: 0, monthTotal: 0 })
  const [enabled, setEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('outstanding')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [payOpen, setPayOpen] = useState(false)
  const [paySupplier, setPaySupplier] = useState<PayableRow | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentKey, setPaymentKey] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inventory/payables')
      const json = await res.json()
      if (json.error) throw new Error(json.error.message)
      setRows(json.data?.rows ?? [])
      setSum({
        totalOutstanding: json.data?.totalOutstanding ?? 0,
        weekTotal: json.data?.weekTotal ?? 0,
        monthTotal: json.data?.monthTotal ?? 0,
      })
      setEnabled(!!json.data?.enabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const filtered = rows.filter(r => r.supplierName.toLowerCase().includes(search.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'supplierName') return a.supplierName.localeCompare(b.supplierName) * (sortDir === 'asc' ? 1 : -1)
    const va = a[sortKey as keyof PayableRow] as number
    const vb = b[sortKey as keyof PayableRow] as number
    return (va - vb) * (sortDir === 'asc' ? 1 : -1)
  })

  const recordPayment = async () => {
    const amount = Number(payAmount)
    if (!paySupplier || !(amount > 0)) return
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/inventory/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: paySupplier.supplierId, amount, paidAt: new Date(`${payDate}T12:00:00`).toISOString(), idempotencyKey: paymentKey }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Payment failed')
      setPayOpen(false)
      setPayAmount('')
      setNotice(`Payment of ${formatMoney(amount)} recorded against ${paySupplier.supplierName}.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    }
  }

  const columns: Column<PayableRow>[] = [
    { key: 'supplierName', header: 'Supplier', sortable: true, render: r => <span style={{ color: C.text, fontWeight: 600 }}>{r.supplierName}</span>, csv: r => r.supplierName },
    { key: 'week', header: 'This Week', align: 'right', sortable: true, render: r => <Money v={r.week} />, csv: r => r.week },
    { key: 'month', header: 'This Month', align: 'right', sortable: true, render: r => <Money v={r.month} />, csv: r => r.month },
    { key: 'outstanding', header: 'Outstanding', align: 'right', sortable: true, render: r => <Tenure v={r.outstanding} />, csv: r => r.outstanding },
    {
      key: 'terms', header: 'Terms', sortable: true,
      render: r => r.paymentTerms ? (
        <span style={{ color: C.textSoft, fontSize: 12.5, fontWeight: 600 }}>{r.paymentTerms}</span>
      ) : '—',
      csv: r => r.paymentTerms ?? '',
    },
    {
      key: 'nextDue', header: 'Due', align: 'right', sortable: true,
      render: r => r.nextDueDate ? (
        <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          <span style={{ color: r.daysToDue !== null && r.daysToDue < 0 ? C.dangerText : C.textSoft }}>{formatDate(r.nextDueDate)}</span>
          {' '}
          {r.daysToDue !== null && r.daysToDue < 0 ? (
            <b style={{ color: C.dangerText }}>overdue {Math.abs(r.daysToDue)}d</b>
          ) : r.daysToDue === 0 ? (
            <b style={{ color: C.warningText }}>due today</b>
          ) : (
            <span style={{ color: C.textMuted, fontSize: 12 }}>in {r.daysToDue}d</span>
          )}
        </span>
      ) : '—',
      csv: r => r.nextDueDate ?? '',
    },
    {
      key: 'lastInvoice', header: 'Last Invoice', align: 'right', sortable: true,
      render: r => r.lastInvoiceDate ? <span style={{ color: C.textSoft, fontVariantNumeric: 'tabular-nums' }}>{formatDate(r.lastInvoiceDate)} · <b>{formatMoney(r.lastInvoiceAmount)}</b></span> : '—',
      csv: r => r.lastInvoiceDate ?? '',
    },
    {
      key: 'lastPayment', header: 'Last Payment', align: 'right', sortable: true,
      render: r => r.lastPaymentDate ? <span style={{ color: C.textSoft, fontVariantNumeric: 'tabular-nums' }}>{formatDate(r.lastPaymentDate)} · <b>{formatMoney(r.lastPaymentAmount)}</b></span> : '—',
      csv: r => r.lastPaymentDate ?? '',
    },
    {
      key: 'status', header: 'Status', render: r => (
        <Badge tone={STATUS_TONE[r.status]}>{r.status.replace('_', ' ')}</Badge>
      ),
      csv: r => r.status,
    },
    {
      key: 'action', header: '', align: 'right',
      render: r => r.outstanding > 0.004 ? (
        <Button variant="ghost" onClick={() => { setPaySupplier(r); setPayAmount(''); setPaymentKey(crypto.randomUUID()); setPayOpen(true) }}>Record payment</Button>
      ) : null,
    },
  ]

  const doExport = () => exportCsv(
    'supplier-payables.csv',
    columns.map(c => c.header).filter(Boolean),
    sorted.map(r => columns.filter(c => c.header).map(c => (c.csv ? c.csv(r) : String(c.render(r) ?? '').replace(/<[^>]+>/g, '')))),
  )

  return (
    <div>
      <PageTitle
        title="Supplier Payables"
        subtitle="What we owe, what we have spent, and the latest invoice and payment per supplier."
        right={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search suppliers…" />
            <ExportButton onClick={doExport} disabled={sorted.length === 0} />
          </>
        }
      />

      {!enabled && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.4)', color: C.warningText, fontSize: 13, marginBottom: 16 }}>
          Invoice and payment tables are not set up yet — outstanding balances will read zero until migration 064 is applied.
        </div>
      )}

      {notice && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(107,188,89,0.1)', border: '1px solid rgba(107,188,89,0.4)', color: C.successText, fontSize: 13, marginBottom: 16 }}>
          {notice}
        </div>
      )}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: C.dangerText, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Outstanding (open invoices)', v: sum.totalOutstanding, gold: true },
          { label: 'This week — invoiced', v: sum.weekTotal },
          { label: 'This month — invoiced', v: sum.monthTotal },
        ].map(k => (
          <div key={k.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted }}>{k.label}</p>
            <p style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 800, color: (k as { gold?: boolean }).gold ? C.goldBright : C.text, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(k.v)}</p>
          </div>
        ))}
      </div>

      <Card>
        {loading ? <Loading /> : rows.length === 0 ? (
          <Empty title="No suppliers on record" message="Activated suppliers appear here with their invoice positions." />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={sorted}
              sortKey={sortKey}
              setSortKey={setSortKey}
              sortDir={sortDir}
              setSortDir={setSortDir}
              rowKey={r => r.supplierId}
              minWidth={1080}
            />
            <p style={{ margin: '12px 0 0', fontSize: 12, color: C.textMuted }}>
              Outstanding = open invoices less recorded payments. Overdue marks invoices past their due date (computed from the supplier's payment terms at load time).
            </p>
          </>
        )}
      </Card>

      {payOpen && paySupplier && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setPayOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, background: C.bgRaised, border: `1px solid ${C.borderStrong}`, borderRadius: 14, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>Record payment</h3>
            <p style={{ margin: '6px 0 16px', fontSize: 13, color: C.textMuted }}>
              {paySupplier.supplierName} — outstanding {formatMoney(paySupplier.outstanding)} across {paySupplier.openInvoiceCount} open invoice{paySupplier.openInvoiceCount !== 1 ? 's' : ''}.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Amount (R)">
                <TextInput value={payAmount} onChange={setPayAmount} placeholder="0.00" type="number" />
              </Field>
              <Field label="Date">
                <DateInput value={payDate} onChange={setPayDate} />
              </Field>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                <Button variant="ghost" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button onClick={() => void recordPayment()} disabled={!(Number(payAmount) > 0)}>Record payment</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Money({ v }: { v: number }) {
  return <span style={{ color: v > 0 ? C.text : C.textMuted, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(v)}</span>
}

function Tenure({ v }: { v: number }) {
  return <span style={{ color: v > 0.004 ? C.goldBright : C.successText, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(v)}</span>
}
