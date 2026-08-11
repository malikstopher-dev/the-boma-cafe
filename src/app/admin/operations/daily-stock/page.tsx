'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'

interface ItemRow {
  productId: string
  productName: string
  sku: string | null
  sectionLabel: string
  countUomName: string | null
  expectedUnits: number
  countedUnits: number | null
  varianceUnits: number | null
  varianceValue: number | null
  unitCost: number | null
}

interface Section {
  profileName: string
  sectionLabel: string
  countUomName: string | null
  items: ItemRow[]
}

interface Sheet {
  sessionId: string
  sessionStatus: string
  locationName: string
  date: string
  week: number
  sections: Section[]
  countedProducts: number
  totalProducts: number
}

const TYPES = [
  { value: '', label: 'All types' },
  { value: 'FOOD', label: 'Food' },
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'PACKAGING', label: 'Packaging' },
  { value: 'GAS', label: 'Gas' },
  { value: 'GENERAL', label: 'General' },
]

const fmt = (n: number | string | null | undefined, digits = 2) => {
  const v = typeof n === 'string' ? (n.trim() === '' ? null : Number(n)) : (n ?? null)
  if (v === null || Number.isNaN(v)) return ''
  return v.toLocaleString('en-ZA', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}
const money = (n: number | null | undefined) => n === null || n === undefined || Number.isNaN(n) ? '' : `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function DailyStockInput() {
  const router = useRouter()
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([])
  const [locationId, setLocationId] = useState('main')
  const [date, setDate] = useState(todayStr())
  const [type, setType] = useState('')
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [cellValues, setCellValues] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/inventory/locations')
      .then(r => r.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json.data ?? [])
        if (Array.isArray(list) && list.length) setLocations(list.filter((l: { is_active?: boolean }) => l.is_active !== false))
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    fetch(`/api/inventory/daily-stock?location_id=${encodeURIComponent(locationId)}&date=${date}${type ? `&inventory_type=${type}` : ''}`)
      .then(r => r.json())
      .then(res => {
        if (!res.data) { setError(res.error?.message ?? 'Failed to load'); return }
        const s: Sheet = res.data
        setSheet(s)
        setCellValues({})
                for (const sec of s.sections) {
          for (const item of sec.items) {
            const key = `${sec.sectionLabel}:${item.productId}`
            setCellValues(v => ({ ...v, [key]: item.countedUnits === null ? '' : fmt(item.countedUnits, 3) }))
          }
        }
      })
      .catch(() => setError('Failed to load sheet'))
      .finally(() => setLoading(false))
  }, [locationId, date, type])

  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => {
    const out: Array<ItemRow & { key: string }> = []
    for (const sec of sheet?.sections ?? []) {
      for (const item of sec.items) out.push({ ...item, key: `${sec.sectionLabel}:${item.productId}` })
    }
    return out
  }, [sheet])

  const saveCell = useCallback(async (key: string, value: string) => {
    if (!sheet) return
    setSaving(true)
    try {
      const parsed = value.trim() === '' ? 0 : Number(value.replace(/,/g, ''))
      const res = await fetch(`/api/inventory/daily-stock/${sheet.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: key.split(':')[1], counted: Number.isFinite(parsed) ? parsed : 0 }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Save failed')
                } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [sheet])

  const onCellBlur = (key: string, value: string) => {
    if (value.trim() === '') return
    void saveCell(key, value)
  }

  const submitSheet = async () => {
    if (!sheet) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/daily-stock/${sheet.sessionId}`, { method: 'PATCH' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Submit failed')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Submit failed') } finally { setSaving(false) }
  }

  const approveSheet = async () => {
    if (!sheet || !confirm('Approve this sheet? Variances will be posted to the ledger as adjustments.')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/daily-stock/${sheet.sessionId}/approve`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Approve failed')
      router.refresh()
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Approve failed') } finally { setSaving(false) }
  }

  const totalVariance = rows.reduce((s, r) => s + (r.varianceValue ?? 0), 0)

  return (
    <AdminPage
      title="Daily Stock Input"
      description={`${sheet ? `${sheet.locationName} · ${sheet.date} · Week ${sheet.week}` : 'Punch in today\'s stock per location'} — one row per product, Enter ↓ to move down, Tab → to move across.`}
      actions={
        <>
          <select value={locationId} onChange={e => setLocationId(e.target.value)} style={{ background: '#241D14', color: '#F0EBE3', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            {locations.length === 0 && <option value="main">Loading locations…</option>}
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ background: '#241D14', color: '#F0EBE3', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 13 }} />
          <select value={type} onChange={e => setType(e.target.value)} style={{ background: '#241D14', color: '#F0EBE3', border: '1px solid #3A3428', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <Button variant="secondary" size="md" onClick={() => void load()}>↻ Reload</Button>
          <Link href="/inv/stock" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="md">Open Stock Sheet</Button>
          </Link>
        </>
      }
    >
      {error && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(232,84,84,0.1)', border: '1px solid rgba(232,84,84,0.4)', color: '#E85454', fontSize: 13 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8C8275', fontSize: 14 }}>Loading sheet…</div>
      ) : !sheet || rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8C8275', fontSize: 14 }}>
          Nothing to count here yet. Configure counting sections (e.g. “Bottles”, “Tots”) on the profile manager, or switch location/type.
        </div>
      ) : (
        <>
          {/* Status + summary bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{
              padding: '4px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              background: sheet.sessionStatus === 'approved' ? 'rgba(107,188,89,0.15)' : sheet.sessionStatus === 'submitted' ? 'rgba(240,180,41,0.15)' : 'rgba(90,158,230,0.15)',
              color: sheet.sessionStatus === 'approved' ? '#6BBD59' : sheet.sessionStatus === 'submitted' ? '#E8B93C' : '#5A9EE6',
            }}>
              {sheet.sessionStatus === 'approved' ? '✓ Approved — locked' : sheet.sessionStatus === 'submitted' ? 'Submitted — awaiting approval' : 'In progress'}
            </span>
            <span style={{ fontSize: 13, color: '#A09888' }}>{sheet.countedProducts}/{sheet.totalProducts} products counted</span>
            <span style={{ fontSize: 13, color: '#8C8275' }}>·</span>
            <span style={{ fontSize: 13, color: '#A09888' }}>Total variance value: <b style={{ color: totalVariance < 0 ? '#E85454' : totalVariance > 0 ? '#6BBD59' : '#A09888' }}>{money(totalVariance)}</b></span>
            {sheet.sessionStatus === 'in_progress' && (
              <Button variant="secondary" size="md" onClick={() => void submitSheet()} disabled={saving}>Mark Submitted</Button>
            )}
            {sheet.sessionStatus === 'submitted' && (
              <Button variant="primary" size="md" onClick={() => void approveSheet()} disabled={saving}>Approve & Post Adjustments</Button>
            )}
          </div>

          {/* Spreadsheet */}
          <div style={{ overflowX: 'auto', border: '1px solid #3A3428', borderRadius: 12, background: '#1E1A14' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#26211A' }}>
                  {['Section', 'Product', 'SKU', 'Unit', 'Expected', 'Counted', 'Variance', 'Value'].map(h => (
                    <th key={h} style={{
                      position: 'sticky', top: 0, zIndex: 2, textAlign: h === 'Counted' ? 'center' : 'left',
                      padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A09888',
                      background: '#26211A', borderBottom: '1px solid #3A3428', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const val = cellValues[r.key] ?? ''
                  const counted = val.trim() === '' ? null : Number(val.replace(/,/g, ''))
                  const variance = counted === null ? null : counted - r.expectedUnits
                  const varianceMoney = r.unitCost === null || variance === null ? null : variance * r.unitCost
                  return (
                    <tr key={r.key} style={{ background: i % 2 === 0 ? '#1E1A14' : '#221E16', borderBottom: '1px solid #2A261E' }}>
                      <td style={{ padding: '6px 12px', color: '#C8A04E', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{r.sectionLabel}</td>
                      <td style={{ padding: '6px 12px', color: '#F0EBE3', fontWeight: 500 }}>{r.productName}</td>
                      <td style={{ padding: '6px 12px', color: '#6B6358', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{r.sku ?? '—'}</td>
                      <td style={{ padding: '6px 12px', color: '#8C8275', fontSize: 12 }}>{r.countUomName ?? 'units'}</td>
                      <td style={{ padding: '6px 12px', color: '#A09888', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.expectedUnits)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', width: 130 }}>
                        {sheet.sessionStatus === 'approved' ? (
                          <span style={{ color: '#F0EBE3', fontVariantNumeric: 'tabular-nums' }}>{fmt(cellValues[r.key] ?? r.countedUnits)}</span>
                        ) : (
                          <input
                            ref={el => { inputRefs.current[r.key] = el }}
                            value={val}
                            onChange={e => setCellValues(v => ({ ...v, [r.key]: e.target.value }))}
                            onBlur={e => onCellBlur(r.key, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                const next = rows[i + 1]
                                if (next) inputRefs.current[next.key]?.focus()
                              }
                            }}
                            placeholder="0"
                            style={{
                              width: '100%', background: '#16130E', color: '#F0EBE3', border: val === '' ? '1px solid #3A3428' : '1px solid rgba(200,160,78,0.5)',
                              borderRadius: 6, padding: '7px 10px', fontSize: 13, textAlign: 'right', outline: 'none', fontVariantNumeric: 'tabular-nums',
                            }}
                          />
                        )}
                      </td>
                      <td style={{
                        padding: '6px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                        color: variance === null ? '#6B6358' : variance < 0 ? '#E85454' : variance > 0 ? '#6BBD59' : '#8C8275',
                      }}>
                        {variance === null ? '—' : (variance > 0 ? '+' : '') + fmt(variance)}
                      </td>
                      <td style={{
                        padding: '6px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                        color: varianceMoney === null ? '#6B6358' : varianceMoney < 0 ? '#E85454' : varianceMoney > 0 ? '#6BBD59' : '#8C8275',
                      }}>
                        {varianceMoney === null ? '—' : money(varianceMoney)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#26211A', borderTop: '1px solid #3A3428' }}>
                  <td colSpan={6} style={{ padding: '10px 12px', fontSize: 12, color: '#A09888' }}>
                    {saving ? 'Saving…' : 'Type a number and press Enter or Tab — cells autosave on change.'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#F0EBE3' }}>{money(totalVariance)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </AdminPage>
  )
}