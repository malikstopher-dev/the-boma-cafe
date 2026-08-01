'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

type StockCount = {
  id: string
  location_id: string
  status: string
  performed_by: string | null
  created_at: string
  notes: string | null
}

type VarianceRow = {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number
  variance: number
  variancePct: number
}

const statusBadge: Record<string, { variant: 'success' | 'warning' | 'info' | 'danger'; label: string }> = {
  approved: { variant: 'success', label: 'Approved' },
  submitted: { variant: 'warning', label: 'Submitted' },
  in_progress: { variant: 'info', label: 'In Progress' },
  cancelled: { variant: 'danger', label: 'Cancelled' },
}

const kpiCard: React.CSSProperties = {
  background: '#12121A',
  border: '1px solid #1E1E2A',
  borderRadius: 12,
  padding: 20,
}

export default function VarianceReportPage() {
  const [stockCounts, setStockCounts] = useState<StockCount[]>([])
  const [selectedCount, setSelectedCount] = useState<string | null>(null)
  const [varianceData, setVarianceData] = useState<VarianceRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadingVariance, setLoadingVariance] = useState(false)
  const [sortField, setSortField] = useState<'variancePct' | 'variance' | 'productName'>('variancePct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetch('/api/inventory/stock-counts?limit=20')
      .then(r => r.json())
      .then(json => {
        setStockCounts(json.data ?? [])
        if (json.data?.length > 0) {
          setSelectedCount(json.data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCount) return
    setLoadingVariance(true)
    fetch(`/api/inventory/reports/variance?stock_count_id=${selectedCount}`)
      .then(r => r.json())
      .then(json => setVarianceData(json.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingVariance(false))
  }, [selectedCount])

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const sorted = [...varianceData].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1
    if (sortField === 'productName') return mul * a.productName.localeCompare(b.productName)
    return mul * (a[sortField] - b[sortField])
  })

  const totalVariance = varianceData.reduce((s, r) => s + Math.abs(r.variance), 0)
  const significantVariance = varianceData.filter(r => Math.abs(r.variancePct) > 5).length

  return (
    <AdminPage
      title="Variance Report"
      description="Compare expected vs actual stock from stock counts"
      actions={
        <select
          value={selectedCount ?? ''}
          onChange={e => setSelectedCount(e.target.value || null)}
          className={styles.input + ' ' + styles.select}
          style={{ width: 280 }}
        >
          {stockCounts.map(sc => (
            <option key={sc.id} value={sc.id}>
              {new Date(sc.created_at).toLocaleDateString('en-ZA')} — {sc.status}
            </option>
          ))}
        </select>
      }
    >
      <div style={{ padding: '0 24px' }}>
        {isLoading ? (
          <div style={{ color: '#8A8694', padding: '48px 0', textAlign: 'center' }}>Loading stock counts...</div>
        ) : stockCounts.length === 0 ? (
          <div style={{ color: '#5A5666', padding: '48px 0', textAlign: 'center' }}>No stock counts found. Complete a stock count first.</div>
        ) : (
          <>
            <div className={styles.kpiGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
              <div style={kpiCard}>
                <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Variance</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#FBBF24' }}>{totalVariance.toFixed(2)}</p>
              </div>
              <div style={kpiCard}>
                <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Items Counted</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#F0EDE8' }}>{varianceData.length}</p>
              </div>
              <div style={kpiCard}>
                <p style={{ fontSize: 12, color: '#8A8694', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Significant Variances (&gt;5%)</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: significantVariance > 0 ? '#F87171' : '#34D399' }}>
                  {significantVariance}
                </p>
              </div>
            </div>

            {loadingVariance ? (
              <div style={{ color: '#8A8694', padding: '32px 0', textAlign: 'center' }}>Loading variance data...</div>
            ) : sorted.length === 0 ? (
              <div style={{ color: '#5A5666', padding: '32px 0', textAlign: 'center' }}>No variance data for this stock count</div>
            ) : (
              <div className={styles.dataTableWrapper}>
                <table className={styles.dataTableElement}>
                  <thead>
                    <tr>
                      <th
                        className={`${styles.dataTableHeader} ${styles.dataTableHeaderSortable}`}
                        onClick={() => handleSort('productName')}
                      >
                        <span className={styles.dataTableHeaderContent}>
                          Product {sortField === 'productName' && <span className={styles.dataTableSortIcon}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Expected</th>
                      <th className={styles.dataTableHeader} style={{ textAlign: 'right' }}>Physical</th>
                      <th
                        className={`${styles.dataTableHeader} ${styles.dataTableHeaderSortable}`}
                        style={{ textAlign: 'right' }}
                        onClick={() => handleSort('variance')}
                      >
                        <span className={styles.dataTableHeaderContent}>
                          Variance {sortField === 'variance' && <span className={styles.dataTableSortIcon}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                      <th
                        className={`${styles.dataTableHeader} ${styles.dataTableHeaderSortable}`}
                        style={{ textAlign: 'right' }}
                        onClick={() => handleSort('variancePct')}
                      >
                        <span className={styles.dataTableHeaderContent}>
                          % {sortField === 'variancePct' && <span className={styles.dataTableSortIcon}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(row => {
                      const varianceColor = row.variance === 0 ? '#34D399' : Math.abs(row.variancePct) > 5 ? '#F87171' : '#FBBF24'
                      return (
                        <tr key={row.productId} className={styles.dataTableRow}>
                          <td className={styles.dataTableCell}>{row.productName}</td>
                          <td className={styles.dataTableCell} style={{ textAlign: 'right' }}>{row.expectedQuantity.toFixed(2)}</td>
                          <td className={styles.dataTableCell} style={{ textAlign: 'right' }}>{row.physicalQuantity.toFixed(2)}</td>
                          <td className={styles.dataTableCell} style={{ textAlign: 'right', color: varianceColor }}>
                            {row.variance > 0 ? '+' : ''}{row.variance.toFixed(2)}
                          </td>
                          <td className={styles.dataTableCell} style={{ textAlign: 'right' }}>
                            <Badge variant={Math.abs(row.variancePct) > 5 ? 'danger' : row.variance === 0 ? 'success' : 'warning'}>
                              {row.variancePct >= 0 ? '+' : ''}{row.variancePct.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPage>
  )
}
