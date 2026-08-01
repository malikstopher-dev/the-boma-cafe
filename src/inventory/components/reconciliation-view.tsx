'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import OperationsPageLayout from '@/components/admin/design-system/OperationsPageLayout'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

interface ReconciliationRow {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number | null
  variance: number | null
  unitCost: number | null
  varianceValue: number | null
}

const kpiCard: React.CSSProperties = {
  background: '#12121A',
  border: '1px solid #1E1E2A',
  borderRadius: 12,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
}

export default function ReconciliationView({ forcedType }: { forcedType?: string }) {
  const [rows, setRows] = useState<ReconciliationRow[]>([])
  const [filteredRows, setFilteredRows] = useState<ReconciliationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showVarianceOnly, setShowVarianceOnly] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [physMap, setPhysMap] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const fetchReconciliation = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('section', 'reconciliation')
      params.set('location_id', 'main')
      params.set('date', date)
      if (forcedType) params.set('inventory_type', forcedType)
      const res = await fetch(`/api/inventory/dashboard?${params}`)
      const json = await res.json()
      const data: ReconciliationRow[] = json.data ?? []
      setRows(data)
      setFilteredRows(data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [date, forcedType])

  useEffect(() => {
    fetchReconciliation()
  }, [fetchReconciliation])

  useEffect(() => {
    let result = rows
    if (showVarianceOnly) {
      result = result.filter(r => r.variance !== null && r.variance !== 0)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r => r.productName.toLowerCase().includes(q))
    }
    setFilteredRows(result)
  }, [rows, showVarianceOnly, search])

  function updatePhys(productId: string, value: string) {
    setPhysMap(prev => ({ ...prev, [productId]: value }))
  }

  function calculateVariance(row: ReconciliationRow): { variance: number; varianceValue: number | null } {
    const expected = row.expectedQuantity
    const physStr = physMap[row.productId]
    const physical = physStr !== undefined && physStr !== '' ? parseFloat(physStr) : row.physicalQuantity
    if (physical === null || physical === undefined || isNaN(physical)) {
      return { variance: 0, varianceValue: null }
    }
    const variance = physical - expected
    const varianceValue = row.unitCost ? variance * row.unitCost : null
    return { variance, varianceValue }
  }

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId
    const res = await fetch('/api/inventory/stock-counts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: 'main', notes: `Morning reconciliation ${date}` }),
    })
    const json = await res.json()
    const newId = json.data?.stockCount?.id
    if (!res.ok || !newId) {
      throw new Error(json.error?.message || 'Failed to create stock count session')
    }
    setSessionId(newId)
    return newId as string
  }

  async function savePhysical(productId: string) {
    setSaving(productId)
    try {
      const val = physMap[productId]
      if (val === undefined || val === '') return
      const physical = parseFloat(val)
      const id = await ensureSession()
      const res = await fetch(`/api/inventory/stock-counts/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, physical_quantity: physical }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error?.message || 'Save failed')
      }
      setRows(prev =>
        prev.map(r =>
          r.productId === productId
            ? { ...r, physicalQuantity: physical, variance: physical - r.expectedQuantity, varianceValue: r.unitCost ? (physical - r.expectedQuantity) * r.unitCost : null }
            : r
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save count')
    } finally {
      setSaving(null)
    }
  }

  const totalExpected = filteredRows.reduce((s, r) => s + Math.abs(r.expectedQuantity), 0)
  const totalVariance = filteredRows.reduce((s, r) => s + Math.abs(calculateVariance(r).variance), 0)
  const totalVarianceValue = filteredRows.reduce((s, r) => s + (calculateVariance(r).varianceValue ?? 0), 0)

  const checkedCount = rows.filter(r => physMap[r.productId] !== undefined || r.physicalQuantity !== null).length
  const varianceCount = rows.filter(r => {
    const { variance } = calculateVariance(r)
    return variance !== 0
  }).length

  const typeLabel = forcedType ? `${forcedType.charAt(0) + forcedType.slice(1).toLowerCase()} ` : ''

  return (
    <AdminPage
      title={`${typeLabel}Morning Reconciliation`}
      description={`Compare expected vs actual ${forcedType ? typeLabel.toLowerCase().trim() : 'stock'} levels`}
      actions={
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className={styles.input}
          style={{ width: 200 }}
        />
      }
    >
      <OperationsPageLayout
        whatHappened={
          <div className={styles.kpiGrid} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <div style={kpiCard}>
              <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Products Checked</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#F0EDE8' }}>
                {checkedCount}
                <span style={{ fontSize: 14, fontWeight: 400, color: '#5A5666' }}> / {rows.length}</span>
              </p>
            </div>
            <div style={kpiCard}>
              <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Variance</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: totalVariance > 0 ? '#FBBF24' : '#34D399' }}>
                {totalVariance.toFixed(2)}
              </p>
            </div>
            <div style={kpiCard}>
              <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Variance Value</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: totalVarianceValue < 0 ? '#F87171' : '#34D399' }}>
                R {totalVarianceValue.toFixed(2)}
              </p>
            </div>
          </div>
        }
        needsAttention={
          varianceCount > 0 ? (
            <div className={styles.alertCard + ' ' + styles.alertCardWarning}>
              <span className={styles.alertCardIcon}>⚠</span>
              <span>
                {varianceCount} product{varianceCount === 1 ? '' : 's'} {varianceCount === 1 ? 'has' : 'have'} a variance
                — tick the &quot;Variances only&quot; filter below to review them.
              </span>
            </div>
          ) : (
            <div className={styles.alertCard + ' ' + styles.alertCardSuccess}>
              <span className={styles.alertCardIcon}>✓</span>
              <span>No variances recorded so far today.</span>
            </div>
          )
        }
        nextActions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button onClick={fetchReconciliation} variant="primary" size="sm">Refresh</Button>
            <Link href="/admin/operations">
              <Button variant="secondary" size="sm">Open Opening Checklist</Button>
            </Link>
            <Link href="/admin/operations/stock-counts">
              <Button variant="secondary" size="sm">Start Stock Count</Button>
            </Link>
          </div>
        }
      >
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Reconciliation Detail</h2>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <div className={styles.filterBarSearch} style={{ maxWidth: 280 }}>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={styles.filterBarSearchInput}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8A8694', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showVarianceOnly}
                onChange={e => setShowVarianceOnly(e.target.checked)}
                style={{ accentColor: '#D4A843' }}
              />
              Variances only
            </label>
          </div>

          {isLoading ? (
            <div style={{ color: '#8A8694', padding: '48px 0', textAlign: 'center' }}>Loading...</div>
          ) : filteredRows.length === 0 ? (
            <div style={{ color: '#5A5666', padding: '48px 0', textAlign: 'center' }}>No products found</div>
          ) : (
            <div className={styles.dataTableWrapper}>
              <table className={styles.dataTableElement}>
                <thead>
                  <tr>
                    <th className={styles.dataTableHeader}>Product</th>
                    <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Expected</th>
                    <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Physical</th>
                    <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Variance</th>
                    <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Value</th>
                    <th className={styles.dataTableHeader}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => {
                    const { variance, varianceValue } = calculateVariance(row)
                    const hasPhys = physMap[row.productId] !== undefined || row.physicalQuantity !== null
                    return (
                      <tr key={row.productId} className={styles.dataTableRow}>
                        <td className={styles.dataTableCell}>{row.productName}</td>
                        <td className={styles.dataTableCell} style={{ textAlign: 'right', color: '#8A8694' }}>{row.expectedQuantity.toFixed(2)}</td>
                        <td className={styles.dataTableCell}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={physMap[row.productId] ?? row.physicalQuantity ?? ''}
                              onChange={e => updatePhys(row.productId, e.target.value)}
                              className={styles.input}
                              style={{ width: 100, height: 32, textAlign: 'right', fontSize: 13 }}
                              placeholder="0"
                            />
                          </div>
                        </td>
                        <td className={styles.dataTableCell} style={{ textAlign: 'right' }}>
                          {hasPhys ? (
                            <span style={{ color: variance === 0 ? '#34D399' : variance > 0 ? '#FBBF24' : '#F87171' }}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                            </span>
                          ) : (
                            <span style={{ color: '#3A3A4A' }}>—</span>
                          )}
                        </td>
                        <td className={styles.dataTableCell} style={{ textAlign: 'right' }}>
                          {varianceValue !== null ? (
                            <span style={{ color: '#8A8694' }}>R {varianceValue.toFixed(2)}</span>
                          ) : (
                            <span style={{ color: '#3A3A4A' }}>—</span>
                          )}
                        </td>
                        <td className={styles.dataTableCell}>
                          {physMap[row.productId] !== undefined && physMap[row.productId] !== '' && (
                            <button
                              onClick={() => savePhysical(row.productId)}
                              disabled={saving === row.productId}
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: saving === row.productId ? '#3A3A4A' : '#D4A843',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {saving === row.productId ? '...' : 'Save'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </OperationsPageLayout>
    </AdminPage>
  )
}
