'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Supplier {
  id: string
  name: string | null
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  is_active: boolean
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/inventory/suppliers?${params}`)
    const json = await res.json()
    if (json.error) setError(json.error.message)
    else setSuppliers(json.data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { void load() }, [load])

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Suppliers</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Who you buy from. Manage suppliers, contacts and purchase history in the main admin.{' '}
        <Link href="/admin/operations/suppliers" style={{ color: '#C4A04E' }}>Manage suppliers →</Link>
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <input
        placeholder="Search suppliers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ background: '#141E2B', color: '#E8E6F0', border: '1px solid #2A3648', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', width: 320, marginBottom: 22 }}
      />

      <div style={cardStyle}>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : suppliers.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No suppliers found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Contact', 'Phone', 'Email', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}>
                    <Link href={`/admin/operations/suppliers/${s.id}`} style={{ color: '#C4A04E', textDecoration: 'none' }}>
                      {s.name ?? '—'}
                    </Link>
                  </td>
                  <td style={tdStyle}>{s.contact_name ?? '—'}</td>
                  <td style={tdStyle}>{s.phone ?? '—'}</td>
                  <td style={tdStyle}>{s.email ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: s.is_active !== false ? '#12301A' : '#3A1216',
                      color: s.is_active !== false ? '#7FB069' : '#E06060',
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    }}>{s.is_active !== false ? 'ACTIVE' : 'ARCHIVED'}</span>
                  </td>
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