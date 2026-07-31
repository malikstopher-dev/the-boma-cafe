'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import OperationsPageLayout from '@/components/admin/design-system/OperationsPageLayout'

interface ReconciliationRow {
  productId: string
  productName: string
  expectedQuantity: number
  physicalQuantity: number | null
  variance: number | null
  unitCost: number | null
  varianceValue: number | null
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
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
          />
        </div>
      }
    >
      <OperationsPageLayout
        whatHappened={
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Products Checked</p>
              <p className="text-2xl font-bold text-white mt-1">
                {checkedCount}
                <span className="text-sm text-gray-500 font-normal"> / {rows.length}</span>
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Variance</p>
              <p className={`text-2xl font-bold mt-1 ${totalVariance > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {totalVariance.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Variance Value</p>
              <p className={`text-2xl font-bold mt-1 ${totalVarianceValue < 0 ? 'text-red-400' : 'text-green-400'}`}>
                R {totalVarianceValue.toFixed(2)}
              </p>
            </div>
          </div>
        }
        needsAttention={
          varianceCount > 0 ? (
            <div className="bg-yellow-950/40 border border-yellow-800/50 text-yellow-300 rounded-lg p-3 text-sm">
              {varianceCount} product{varianceCount === 1 ? '' : 's'} {varianceCount === 1 ? 'has' : 'have'} a variance
              — tick the &quot;Variances only&quot; filter below to review them.
            </div>
          ) : (
            <div className="bg-green-950/40 border border-green-800/50 text-green-300 rounded-lg p-3 text-sm">
              No variances recorded so far today.
            </div>
          )
        }
        nextActions={
          <div className="flex gap-2 flex-wrap">
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
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reconciliation Detail</h2>

          {/* Filters */}
          <div className="flex gap-3 mb-4 items-center">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 flex-1 max-w-xs"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={showVarianceOnly}
                onChange={e => setShowVarianceOnly(e.target.checked)}
                className="rounded border-gray-600"
              />
              Variances only
            </label>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-gray-400 py-12 text-center">Loading...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-gray-500 py-12 text-center">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left py-2 px-3">Product</th>
                    <th className="text-right py-2 px-3">Expected</th>
                    <th className="text-right py-2 px-3">Physical</th>
                    <th className="text-right py-2 px-3">Variance</th>
                    <th className="text-right py-2 px-3">Value</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => {
                    const { variance, varianceValue } = calculateVariance(row)
                    const hasPhys = physMap[row.productId] !== undefined || row.physicalQuantity !== null
                    return (
                      <tr key={row.productId} className="border-b border-gray-800 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-white">{row.productName}</td>
                        <td className="py-2 px-3 text-right text-gray-300">{row.expectedQuantity.toFixed(2)}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="0.01"
                            value={physMap[row.productId] ?? row.physicalQuantity ?? ''}
                            onChange={e => updatePhys(row.productId, e.target.value)}
                            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-right text-white text-sm ml-auto"
                            placeholder="0"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          {hasPhys ? (
                            <span className={variance === 0 ? 'text-green-400' : variance > 0 ? 'text-yellow-400' : 'text-red-400'}>
                              {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {varianceValue !== null ? (
                            <span className="text-gray-300">R {varianceValue.toFixed(2)}</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {physMap[row.productId] !== undefined && physMap[row.productId] !== '' && (
                            <button
                              onClick={() => savePhysical(row.productId)}
                              disabled={saving === row.productId}
                              className="text-xs text-brand-400 hover:text-brand-300 disabled:text-gray-600"
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
