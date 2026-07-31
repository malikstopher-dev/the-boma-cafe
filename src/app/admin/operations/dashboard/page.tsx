'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'

type DashboardData = {
  summary: {
    inventoryValue: number
    totalProducts: number
    lowStockCount: number
    outOfStockCount: number
    todayPurchases: number
    todaySales: number
    todayLoss: number
    todayTransactions: number
    variance: number
  }
  alerts: Array<{ productId: string; productName: string; type: string; currentBalance: number; threshold: number | null }>
  recent: Array<{ id: string; productName: string; transactionType: string; quantity: number; createdAt: string }>
  fastMovers: Array<{ productId: string; productName: string; totalSold: number }>
  slowMovers: Array<{ productId: string; productName: string; totalSold: number }>
  inventoryValue: number
  todayTransactions: Array<{ type: string; count: number; totalQuantity: number }>
  purchaseOrders?: {
    openCount: number
    overdueCount: number
    overdue: Array<{ id: string; supplierName: string; expectedAt: string }>
    recent: Array<{ id: string; status: string; supplierName: string; createdAt: string }>
  }
}

type InventoryTypeFilter = '' | 'FOOD' | 'BEVERAGE' | 'CLEANING' | 'PACKAGING' | 'GENERAL'

const typeTabs: { label: string; value: InventoryTypeFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Food', value: 'FOOD' },
  { label: 'Beverage', value: 'BEVERAGE' },
  { label: 'Cleaning', value: 'CLEANING' },
  { label: 'Packaging', value: 'PACKAGING' },
  { label: 'General', value: 'GENERAL' },
]

export default function InventoryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeType, setActiveType] = useState<InventoryTypeFilter>('')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const typeParam = activeType ? `&inventory_type=${activeType}` : ''
      const res = await fetch(`/api/inventory/dashboard?section=combined&location_id=main&limit=10&days=30${typeParam}`)
      const json = await res.json()
      setData(json.data)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [activeType])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (isLoading) {
    return (
      <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-4">
              <div className="skeleton-shimmer h-4 w-24 mb-2 rounded" />
              <div className="skeleton-shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
        <style>{`.skeleton-shimmer { background: linear-gradient(90deg, #F1F3F7 25%, #E5E7EB 50%, #F1F3F7 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; } @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      </AdminPage>
    )
  }

  if (!data) {
    return (
      <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs">
        <EmptyState title="Could not load dashboard" description="Check your connection and try again" />
      </AdminPage>
    )
  }

  const { summary, alerts, recent, fastMovers, slowMovers, todayTransactions, purchaseOrders } = data

  const cards = [
    { label: 'Inventory Value', value: `R${summary.inventoryValue.toLocaleString()}`, color: '#0F766E' },
    { label: 'Products', value: summary.totalProducts.toString(), color: '#2563EB' },
    { label: 'Low Stock', value: summary.lowStockCount.toString(), color: '#D97706' },
    { label: 'Out of Stock', value: summary.outOfStockCount.toString(), color: '#DC2626' },
    { label: "Today's Purchases", value: summary.todayPurchases.toString(), color: '#059669' },
    { label: "Today's Sales", value: summary.todaySales.toString(), color: '#7C3AED' },
    { label: "Today's Loss", value: summary.todayLoss.toString(), color: '#DC2626' },
    { label: "Today's Txns", value: summary.todayTransactions.toString(), color: '#0891B2' },
  ]

  const poCards = purchaseOrders ? [
    { label: 'Open POs', value: purchaseOrders.openCount.toString(), color: '#0F766E' },
    { label: 'Overdue', value: purchaseOrders.overdueCount.toString(), color: '#DC2626' },
  ] : []

  const allCards = [...cards, ...poCards]

  return (
    <AdminPage title="Inventory Dashboard" description="Stock overview and KPIs" actions={<Button onClick={fetchData} variant="secondary" size="sm">Refresh</Button>}>
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {typeTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveType(tab.value)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeType === tab.value
                ? 'bg-brand-500/20 text-brand-400 border-b-2 border-brand-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {allCards.map(card => (
          <div key={card.label} className="bg-white rounded-lg border p-4">
            <p className="text-sm text-gray-500 mb-1">{card.label}</p>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Alerts ({alerts.length})</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400">No alerts</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.slice(0, 10).map(a => (
                <div key={a.productId} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1">{a.productName}</span>
                  <Badge variant={a.type === 'negative_balance' || a.type === 'out_of_stock' ? 'danger' : 'warning'}>
                    {a.type.replace('_', ' ')} ({a.currentBalance})
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Today's Transactions</h3>
          {todayTransactions.length === 0 ? (
            <p className="text-sm text-gray-400">No transactions today</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayTransactions.map(t => (
                <div key={t.type} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="capitalize">{t.type.replace('_', ' ')}</span>
                  <span className="font-medium">{t.count} ({t.totalQuantity > 0 ? '+' : ''}{t.totalQuantity})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No recent activity</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recent.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1">{r.productName}</span>
                  <span className="text-xs text-gray-400 capitalize">{r.transactionType}</span>
                  <span className={`ml-2 font-medium ${r.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {r.quantity > 0 ? '+' : ''}{r.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Fast Movers</h3>
          {fastMovers.length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {fastMovers.map((m, i) => (
                <div key={m.productId} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1"><span className="text-gray-400 mr-2">#{i + 1}</span>{m.productName}</span>
                  <span className="font-medium">{m.totalSold}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Slow Movers</h3>
          {slowMovers.length === 0 ? (
            <p className="text-sm text-gray-400">No data</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {slowMovers.map((m, i) => (
                <div key={m.productId} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                  <span className="truncate flex-1"><span className="text-gray-400 mr-2">#{i + 1}</span>{m.productName}</span>
                  <span className="font-medium">{m.totalSold}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Purchase Orders</h3>
          {!purchaseOrders || (purchaseOrders.overdue.length === 0 && purchaseOrders.recent.length === 0) ? (
            <p className="text-sm text-gray-400">No purchase orders</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {purchaseOrders.overdue.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">Overdue Deliveries</p>
                  {purchaseOrders.overdue.map(po => (
                    <a key={po.id} href={`/admin/operations/purchase-orders/${po.id}`} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded mb-1 hover:bg-red-100">
                      <span className="truncate flex-1">{po.supplierName}</span>
                      <Badge variant="danger">Overdue</Badge>
                    </a>
                  ))}
                </div>
              )}
              {purchaseOrders.recent.map(po => (
                <a key={po.id} href={`/admin/operations/purchase-orders/${po.id}`} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded hover:bg-gray-100">
                  <span className="truncate flex-1">{po.supplierName}</span>
                  <Badge variant={po.status === 'received' ? 'success' : po.status === 'ordered' ? 'info' : 'warning'}>{po.status}</Badge>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/operations/products"><Button variant="secondary" size="sm">Products</Button></Link>
            <Link href="/admin/operations/transactions"><Button variant="secondary" size="sm">Transactions</Button></Link>
            <Link href="/admin/operations/imports"><Button variant="secondary" size="sm">Imports</Button></Link>
            <Link href="/admin/operations/reports"><Button variant="secondary" size="sm">Reports</Button></Link>
            <Link href="/admin/operations/purchase-orders"><Button variant="secondary" size="sm">Purchase Orders</Button></Link>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
