'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface PurchaseOrder {
  id: string
  po_number?: string | null
  supplier_id?: string | null
  status: string
  created_at: string
  expected_date?: string | null
  total?: number
  suppliers?: { name?: string | null } | null
}

const STATUS_TONES: Record<string, { fg: string; bg: string }> = {
  draft: { fg: '#90A0B8', bg: '#1E2A3A' },
  approved: { fg: '#7FB0C8', bg: '#12283A' },
  ordered: { fg: '#C4A04E', bg: '#2E2412' },
  partial: { fg: '#E0A060', bg: '#3A2412' },
  received: { fg: '#7FB069', bg: '#12301A' },
  cancelled: { fg: '#E06060', bg: '#3A1216' },
}

export default function PurchasesPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/inventory/purchase-orders')
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else setOrders(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const open = orders.filter((o) => ['draft', 'approved', 'ordered', 'partial'].includes(String(o.status ?? ''))).length
  const received = orders.filter((o) => o.status === 'received').length

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Receive Stock</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Purchase orders awaiting or already received. Receiving moves goods into the ledger.{' '}
        <Link href="/admin/operations/receiving" style={{ color: '#C4A04E' }}>Open receiving queue →</Link>
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <Kpi label="Open purchase orders" value={open} color="#C4A04E" />
        <Kpi label="Received" value={received} color="#7FB069" />
        <Kpi label="All orders" value={orders.length} color="#90A0B8" />
      </div>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No purchase orders yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['PO', 'Supplier', 'Status', 'Created', 'Expected'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/operations/purchase-orders/${po.id}`} style={{ color: '#C4A04E', textDecoration: 'none' }}>
                      {po.po_number ?? po.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td style={tdStyle}>{po.suppliers?.name ?? '—'}</td>
                  <td style={tdStyle}>
                    {POStatus(po.status ?? '')}
                  </td>
                  <td style={tdStyle}>{new Date(po.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>{po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#90A0B8', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function POStatus(status: string) {
  const tone = PurchaseTones[status ?? ''] ?? { fg: '#B9C2D4', bg: '#1E2A3A' }
  return (
    <span style={{ background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {status || 'unknown'}
    </span>
  )
}

const PurchaseTones: Record<string, { fg: string; bg: string }> = {
  draft: { fg: '#E0E6EE', bg: '#20293A' },
  approved: { fg: '#C4A04E', bg: '#2E2412' },
  ordered: { fg: '#7FB0C8', bg: '#12283A' },
  partial: { fg: '#E0A060', bg: '#3A2412' },
  received: { fg: '#7FB069', bg: '#12301A' },
  cancelled: { fg: '#E06060', bg: '#3A1216' },
}

const cardStyle: React.CSSProperties = {
  background: '#141E2B', border: '1px solid #232A3A', borderRadius: 12, padding: 18,
}
const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#90A0B8', padding: '8px 10px', borderBottom: '1px solid #2A3648',
}
const tdStyle: React.CSSProperties = {
  padding: '10px', fontSize: 13, color: '#B9C2D4', borderBottom: '1px solid #232A3A',
}