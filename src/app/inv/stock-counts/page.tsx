'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface StockCount {
  id: string
  status: string
  created_at: string
  submitted_at?: string | null
  approved_at?: string | null
  location_id?: string | null
}

const TONES: Record<string, { fg: string; bg: string }> = {
  draft: { fg: '#E0A060', bg: '#3A2412' },
  submitted: { fg: '#7FB0C8', bg: '#12283A' },
  approved: { fg: '#7FB069', bg: '#12301A' },
  cancelled: { fg: '#E06060', bg: '#3A1216' },
}

export default function StockCountsPage() {
  const [counts, setCounts] = useState<StockCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/inventory/stock-counts')
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else setCounts(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const open = counts.filter((c) => c.status === 'draft' || c.status === 'open').length
  const approved = counts.filter((c) => c.status === 'approved').length

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Stock Counts</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Physical counts reconcile the ledger with reality.{' '}
        <Link href="/admin/operations/stock-counts/new" style={{ color: '#C4A04E' }}>Start a new count →</Link>
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: open > 0 ? '#C4A04E' : '#7FB069' }}>{open}</div>
          <div style={{ fontSize: 12, color: '#90A0B8', marginTop: 2 }}>In progress</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#7FB069' }}>{approved}</div>
          <div style={{ fontSize: 12, color: '#90A0B8', marginTop: 2 }}>Approved</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#B9C2D4' }}>{counts.length}</div>
          <div style={{ fontSize: 12, color: '#90A0B8', marginTop: 2 }}>Total</div>
        </div>
      </div>

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : counts.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No stock counts yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Count', 'Status', 'Created', 'Approved'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/operations/stock-counts/${c.id}`} style={{ color: '#C4A04E', textDecoration: 'none' }}>
                      {c.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      background: (TONES[c.status] ?? { bg: '#20293A' }).bg,
                      color: (TONES[c.status] ?? { fg: '#B9C2D4' }).fg,
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>{c.status ?? '—'}</span>
                  </td>
                  <td style={tdStyle}>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td style={tdStyle}>{c.approved_at ? new Date(c.approved_at).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
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