'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'

interface WeekListRes {
  data: { year: number; currentWeek: number; weeks: Array<{
    year: number; week: number; start: string; end: string
    deliveredQty: number; deliveredValue: number; usedQty: number; usedValue: number
  }> }
}

interface WeekRowsRes {
  data: { week: number; year: number; rows: Array<{
    inventoryType: string; deliveredQty: number; deliveredValue: number; usedQty: number; usedValue: number
  }>; totals: { deliveredValue: number; usedValue: number } }
}

const money = (n: number | null | undefined) => n === null || n === undefined || Number.isNaN(n) ? '' : `R${n.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`
const qty = (n: number | null | undefined) => n === null || n === undefined || Number.isNaN(n) ? '' : n.toLocaleString('en-ZA', { maximumFractionDigits: 1 })

function parseWeekLabel(start: string, end: string, week: number): string {
  const fmt = (iso: string) => {
    const d = new Date(iso + 'T00:00:00Z')
    return `${d.getUTCDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]}`
  }
  return `Week ${week} · ${fmt(start)} – ${fmt(end)}`
}

export default function WeeklyView() {
  const year = new Date().getFullYear()
  const [weeks, setWeeks] = useState<WeekListRes['data']['weeks']>([])
  const [currentWeek, setCurrentWeek] = useState(1)
  const [selected, setSelected] = useState<number | null>(null)
  const [weekData, setWeekData] = useState<WeekRowsRes['data'] | null>(null)
  const [loading, setLoading] = useState(true)

  const loadWeeks = useCallback(async () => {
    setLoading(true)
    fetch(`/api/inventory/weekly?year=${year}`)
      .then(r => r.json())
      .then((res: WeekListRes) => {
        if (!res.data) return
        setWeeks(res.data.weeks)
        setCurrentWeek(res.data.currentWeek)
        const last = res.data.weeks[res.data.weeks.length - 1]
        setSelected(prev => prev ?? last?.week ?? res.data.currentWeek)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [year])

  useEffect(() => { void loadWeeks() }, [loadWeeks])

  useEffect(() => {
    if (!selected) return
    setWeekData(null)
    fetch(`/api/inventory/weekly?year=${year}&week=${selected}&location_id=main`)
      .then(r => r.json())
      .then((res: WeekRowsRes) => { if (res.data) setWeekData(res.data) })
      .catch(() => {})
  }, [selected, year])

  const totals = useMemo(() => {
    const t = weekData?.totals ?? { deliveredValue: 0, usedValue: 0 }
    return { delivered: t.deliveredValue, used: t.usedValue }
  }, [weekData])

  const maxBars = useMemo(() => Math.max(...weeks.map(w => Math.max(w.deliveredValue, w.usedValue)), 1), [weeks])

  const exportCsv = () => {
    if (!weekData) return
    const rows = [
      ['Inventory type', 'Delivered qty', 'Delivered value', 'Used qty', 'Used value'],
      ...weekData.rows.map(r => [r.inventoryType, qty(r.deliveredQty), r.deliveredValue, qty(r.usedQty), r.usedValue]),
    ]
    const blob = new Blob([`\uFEFF` + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `weekly-week-${selected}-${year}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <AdminPage
      title="Weekly View — Delivered vs Sold"
      description={`${year} · Mon–Sun weeks · Supplies received vs stock consumed, per week.`}
      actions={<Button variant="secondary" size="md" onClick={exportCsv} disabled={!weekData}>Export CSV</Button>}
    >
      {/* Week chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {weeks.map(w => (
          <button
            key={w.week}
            onClick={() => setSelected(w.week)}
            style={{
              padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: selected === w.week ? '#C8A04E' : '#241D14',
              color: selected === w.week ? '#14100B' : w.week === currentWeek ? '#E8B93C' : '#A09888',
              border: w.week === currentWeek && selected !== w.week ? '1px solid rgba(232,185,60,0.5)' : '1px solid #3A3428',
            }}
          >
            {w.week === currentWeek ? `Week ${w.week} (now)`: `Week ${w.week}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8C8275' }}>Loading…</div>
      ) : (
        <>
          {/* Weekly bar chart — delivered vs used */}
          <div style={{ background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 20, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#F0EBE3' }}>
                {weekData ? parseWeekLabel((weeks.find(w => w.week === weekData.week)?.start ?? '') || '', weeks.find(w => w.week === weekData?.week)?.end ?? '', weekData.week) : ''}
              </h3>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#A09888' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#C8A04E', marginRight: 6 }} />Delivered</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#5A9EE6', marginRight: 6 }} />Used/Sold</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 130 }}>
              {weeks.map(w => (
                <div key={w.week} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: '100%' }}>
                  <div title={`${parseWeekLabel(w.start, w.end, w.week)} — delivered ${money(w.deliveredValue)}`}
                    style={{ flex: 1, background: '#C8A04E', borderRadius: '3px 3px 0 0', minHeight: 2, height: `${Math.max(2, (w.deliveredValue / maxBars) * 100)}%`, opacity: selected === w.week ? 1 : 0.45 }} />
                  <div title={`${parseWeekLabel(w.start, w.end, w.week)} — used ${money(w.usedValue)}`}
                    style={{ flex: 1, background: '#5A9EE6', borderRadius: '3px 3px 0 0', minHeight: 2, height: `${Math.max(2, (w.usedValue / maxBars) * 100)}%`, opacity: selected === w.week ? 1 : 0.45 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Selected week table */}
          {weekData ? (
            <div style={{ overflowX: 'auto', border: '1px solid #3A3428', borderRadius: 12, background: '#1E1A14' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                <thead>
                  <tr style={{ background: '#26211A' }}>
                    {['Inventory Type', 'Delivered Qty', 'Delivered Value', 'Used Qty', 'Used Value', 'Net Value'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Inventory Type' ? 'left' : 'right', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A09888' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekData.rows.map(r => {
                    const net = r.deliveredValue - r.usedValue
                    return (
                      <tr key={r.inventoryType} style={{ borderBottom: '1px solid #2A261E' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: '#F0EBE3' }}>{r.inventoryType === 'ALL' ? 'Total' : r.inventoryType}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#C8A04E', fontVariantNumeric: 'tabular-nums' }}>{qty(r.deliveredQty)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#C8A04E', fontVariantNumeric: 'tabular-nums' }}>{money(r.deliveredValue)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#5A9EE6', fontVariantNumeric: 'tabular-nums' }}>{qty(r.usedQty)}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', color: '#5A9EE6', fontVariantNumeric: 'tabular-nums' }}>{money(r.usedValue)}</td>
                        <td style={{
                          padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                          color: net >= 0 ? '#6BBD59' : '#E85454',
                        }}>{net >= 0 ? '+' : ''}{money(net)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#26211A' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#F0EBE3' }}>Totals</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#C8A04E', fontWeight: 700 }}>{qty(weekData.rows.reduce((s, r) => s + r.deliveredQty, 0))}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#C8A04E', fontWeight: 700 }}>{money(totals.delivered)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#5A9EE6', fontWeight: 700 }}>{qty(weekData.rows.reduce((s, r) => s + r.usedQty, 0))}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#5A9EE6', fontWeight: 700 }}>{money(totals.used)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, color: totals.delivered - totals.used >= 0 ? '#6BBD59' : '#E85454' }}>
                      {totals.delivered - totals.used >= 0 ? '+' : ''}{money(totals.delivered - totals.used)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : <div style={{ padding: 30, textAlign: 'center', color: '#8C8275' }}>Loading week…</div>}
        </>
      )}
    </AdminPage>
  )
}