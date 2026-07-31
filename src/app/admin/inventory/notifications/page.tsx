'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  message: string | null
  read: boolean
  metadata: Record<string, unknown>
  createdAt: string
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        fetch('/api/inventory/notifications?location_id=main'),
        fetch('/api/inventory/notifications/unread-count?location_id=main'),
      ])
      const list = await listRes.json()
      const count = await countRes.json()
      setItems(list.data ?? [])
      setUnread(count.data?.count ?? 0)
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 60000)
    return () => clearInterval(timer)
  }, [fetchData])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/inventory/notifications?location_id=main', { method: 'POST' })
      const json = await res.json()
      const result = json.data
      if (result && result.created > 0) {
        setLastCheck(`Stock check complete: ${result.created} new alert(s), ${result.resolved} resolved`)
      } else {
        setLastCheck(`Stock check complete: no changes (${result?.created ?? 0} new, ${result?.resolved ?? 0} resolved)`)
      }
      await fetchData()
    } catch {
      setLastCheck('Stock check failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleMarkRead(id: string) {
    await fetch(`/api/inventory/notifications/${id}/read`, { method: 'POST' })
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  async function handleMarkAll() {
    await fetch('/api/inventory/notifications/read-all?location_id=main', { method: 'POST' })
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
  }

  const badgeVariant = (type: string) =>
    type === 'inventory_out_of_stock' ? 'danger' : 'warning'

  return (
    <AdminPage
      title="Notifications"
      description="Low-stock and stock-out alerts"
      actions={
        <>
          <Button onClick={handleGenerate} disabled={generating} size="sm">
            {generating ? 'Checking stock...' : 'Check Stock Now'}
          </Button>
          {unread > 0 && (
            <Button onClick={handleMarkAll} variant="secondary" size="sm">
              Mark all read
            </Button>
          )}
        </>
      }
    >
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Unread</p>
            <p className="text-2xl font-bold text-white mt-1">{unread}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Total Alerts</p>
            <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-400">Out of Stock</p>
            <p className="text-2xl font-bold text-red-400 mt-1">
              {items.filter(n => n.type === 'inventory_out_of_stock' && !n.read).length}
            </p>
          </div>
        </div>

        {lastCheck && (
          <div className="bg-brand-950/40 border border-brand-800/50 text-brand-300 rounded-lg p-3 mb-4 text-sm">
            {lastCheck}
          </div>
        )}

        {isLoading ? (
          <div className="text-gray-400 py-12 text-center">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 py-12 text-center">
            No notifications. Run a stock check to scan for low stock.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(n => (
              <div
                key={n.id}
                className={`bg-gray-900/40 border rounded-lg p-4 flex items-start gap-3 ${
                  n.read ? 'border-gray-800/40 opacity-60' : 'border-gray-700/60'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-brand-400" />}
                    <span className="text-white font-medium text-sm">{n.title}</span>
                    <Badge variant={badgeVariant(n.type)}>
                      {n.type === 'inventory_out_of_stock' ? 'Out of stock' : 'Low stock'}
                    </Badge>
                  </div>
                  {n.message && <p className="text-xs text-gray-400">{n.message}</p>}
                  <p className="text-[11px] text-gray-600 mt-1">
                    {new Date(n.createdAt).toLocaleString('en-ZA')}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="px-3 py-1 text-xs rounded border border-gray-600 text-gray-300 hover:bg-gray-700/40"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPage>
  )
}
