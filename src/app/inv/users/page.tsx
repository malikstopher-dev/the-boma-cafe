'use client'

import { useCallback, useEffect, useState } from 'react'

interface StaffMember {
  id: string
  employee_id: string | null
  name: string | null
  role: string | null
  has_pin: boolean
  on_duty: boolean
  online: boolean
}

const ROLE_INFO: Record<string, { desc: string; fg: string; bg: string }> = {
  admin: { desc: 'Full access — bookings, operations, owner dashboard', fg: '#C4A04E', bg: '#2E2412' },
  kitchen: { desc: 'Kitchen display and order prep', fg: '#7FB0C8', bg: '#12283A' },
  waiter: { desc: 'Tableside ordering via PIN', fg: '#7FB069', bg: '#12301A' },
  bar: { desc: 'Bar station access', fg: '#D8A0C8', bg: '#2A1226' },
}

export default function UsersPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/staff/list')
    const json = await res.json()
    if (json.error) setError(json.error)
    else setStaff(json.staff ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const byRole = (role: string) => staff.filter((s) => s.role === role)

  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Users &amp; Roles</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 20px' }}>
        Existing staff accounts. The Owner signs in with the admin PIN — there is no separate owner role; inventory and
        reporting are admin-only by design.
      </p>

      {error && <p style={{ color: '#E05656', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 22 }}>
        {Object.entries(ROLE_INFO).map(([role, info]) => (
          <div key={role} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#F0EDE8', textTransform: 'capitalize' }}>{role}</span>
              <span style={{ background: info.bg, color: info.fg, fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                {byRole(role).length}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: '#90A0B8', marginTop: 4 }}>{info.desc}</div>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {byRole(role).map((s) => (
                <span key={s.id} style={{
                  background: '#101A26', border: '1px solid #2A3648', borderRadius: 7,
                  padding: '4px 10px', fontSize: 12, color: '#D8D4DC',
                }}>
                  {s.name ?? s.employee_id ?? s.id.slice(0, 8)}
                </span>
              ))}
              {byRole(role).length === 0 && (
                <span style={{ fontSize: 12, color: '#5A6474' }}>No staff in this role</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#F0EDE8', marginBottom: 12 }}>All staff</div>
        {loading ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>Loading…</p>
        ) : staff.length === 0 ? (
          <p style={{ color: '#90A0B8', fontSize: 13 }}>No staff members found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Employee ID', 'Role', 'PIN', 'Shift'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id}>
                  <td style={tdStyle}><span style={{ color: '#F0EDE8' }}>{s.name ?? '—'}</span></td>
                  <td style={tdStyle}>{s.employee_id ?? '—'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: (ROLE_INFO[s.role ?? ''] ?? { bg: '#20293A' }).bg,
                      color: (ROLE_INFO[s.role ?? ''] ?? { fg: '#B9C2D4' }).fg,
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, textTransform: 'uppercase',
                    }}>{s.role ?? '—'}</span>
                  </td>
                  <td style={tdStyle}>{s.has_pin ? 'PIN set' : 'No PIN'}</td>
                  <td style={tdStyle}>
                    <span style={{ color: s.on_duty ? '#7FB069' : '#5A6474' }}>{s.on_duty ? 'On duty' : '—'}</span>
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