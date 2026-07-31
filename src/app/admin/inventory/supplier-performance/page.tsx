'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Badge from '@/components/admin/design-system/Badge'

interface SupplierPerformance {
  supplier_id: string
  supplier_name: string
  total_pos: number
  received_count: number
  cancelled_count: number
  on_time_count: number
  on_time_rate: number
  avg_lead_time_days: number | null
  open_pos: number
}

export default function SupplierPerformancePage() {
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/inventory/reports/supplier-performance')
      .then(r => r.json())
      .then(json => setSuppliers(json.data ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const avgOnTime = suppliers.length > 0
    ? Math.round(suppliers.reduce((s, sp) => s + sp.on_time_rate, 0) / suppliers.length)
    : 0
  const totalOpen = suppliers.reduce((s, sp) => s + sp.open_pos, 0)

  return (
    <AdminPage title="Supplier Performance" subtitle="On-time delivery rates, lead times, and PO history">
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Avg On-Time Rate</p>
            <p className={`text-2xl font-bold mt-1 ${avgOnTime >= 90 ? 'text-green-400' : avgOnTime >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgOnTime}%
            </p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Active Suppliers</p>
            <p className="text-2xl font-bold text-white mt-1">{suppliers.length}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Open POs</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{totalOpen}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">No supplier data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 px-3">Supplier</th>
                  <th className="text-right py-2 px-3">Total POs</th>
                  <th className="text-right py-2 px-3">Received</th>
                  <th className="text-right py-2 px-3">On-Time</th>
                  <th className="text-right py-2 px-3">Rate</th>
                  <th className="text-right py-2 px-3">Avg Lead (days)</th>
                  <th className="text-right py-2 px-3">Open</th>
                  <th className="text-right py-2 px-3">Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(sp => (
                  <tr key={sp.supplier_id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white font-medium">{sp.supplier_name}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{sp.total_pos}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{sp.received_count}</td>
                    <td className="py-2 px-3 text-right text-gray-300">{sp.on_time_count}</td>
                    <td className="py-2 px-3 text-right">
                      <Badge variant={sp.on_time_rate >= 90 ? 'success' : sp.on_time_rate >= 70 ? 'warning' : 'danger'}>
                        {sp.on_time_rate}%
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">{sp.avg_lead_time_days?.toFixed(1) ?? '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={sp.open_pos > 0 ? 'text-yellow-400' : 'text-gray-500'}>{sp.open_pos}</span>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-300">{sp.cancelled_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPage>
  )
}
