'use client'

import { useState, useEffect, useCallback } from 'react'
import { useVisibleInterval } from '@/inventory/lib/use-visible-interval'
import { useRealtimeRefresh } from '@/inventory/lib/use-realtime-refresh'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'

type NotificationItem = {
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
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const unread = items.filter(n => !n.read).length

  const fetchData = useCallback(async () => {
    try {
      const listRes = await fetch('/api/inventory/notifications?location_id=main')
      if (!listRes.ok) return
      const list = await listRes.json()
      setItems(list.data ?? [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useVisibleInterval(() => { void fetchData() }, 300000)

  // E1-1: a new low/out-of-stock alert (from any device's "Check Stock
  // Now" or a movement crossing a threshold) refreshes the list within
  // ~1s. 300s poll stays as the fallback.
  useRealtimeRefresh({
    channel: 'e1-notifications',
    events: ['stock.low'],
    onRefresh: () => { void fetchData() },
  })

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
    const res = await fetch(`/api/inventory/notifications/${id}/read`, { method: 'POST' })
    if (!res.ok) return
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleMarkAll() {
    const res = await fetch('/api/inventory/notifications/read-all?location_id=main', { method: 'POST' })
    if (!res.ok) return
    setItems(prev => prev.map(n => ({ ...n, read: true })))
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
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Unread</p>
            <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3',marginTop:4,fontFamily:'Inter, sans-serif'}}>{unread}</p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Total Alerts</p>
            <p style={{fontSize:24,fontWeight:700,color:'#F0EBE3',marginTop:4,fontFamily:'Inter, sans-serif'}}>{items.length}</p>
          </div>
          <div style={{background:'#1E1A14',border:'1px solid #3A3428',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,color:'#A09888',fontFamily:'Inter, sans-serif'}}>Out of Stock</p>
            <p style={{fontSize:24,fontWeight:700,color:'#E85454',marginTop:4,fontFamily:'Inter, sans-serif'}}>
              {items.filter(n => n.type === 'inventory_out_of_stock' && !n.read).length}
            </p>
          </div>
        </div>

        {lastCheck && (
          <div style={{background:'rgba(200,160,78,0.1)',border:'1px solid rgba(200,160,78,0.3)',color:'#C8A04E',borderRadius:8,padding:12,marginBottom:16,fontSize:14,fontFamily:'Inter, sans-serif'}}>
            {lastCheck}
          </div>
        )}

        {isLoading ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>Loading notifications...</div>
        ) : items.length === 0 ? (
          <div style={{color:'#A09888',padding:'48px 0',textAlign:'center',fontFamily:'Inter, sans-serif'}}>
            No notifications. Run a stock check to scan for low stock.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(n => (
              <div
                key={n.id}
                className={`rounded-lg p-4 flex items-start gap-3 ${
                  n.read ? 'opacity-60' : ''
                }`}
                style={{background:'#242018',border:'1px solid #3A3428'}}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.read && <span style={{width:8,height:8,borderRadius:'50%',background:'#C8A04E',display:'inline-block'}} />}
                    <span className="text-white font-medium text-sm">{n.title}</span>
                    <Badge variant={badgeVariant(n.type)}>
                      {n.type === 'inventory_out_of_stock' ? 'Out of stock' : 'Low stock'}
                    </Badge>
                  </div>
                  {n.message && <p style={{ fontSize: 12, color: '#C8C0B2', marginTop: 2 }}>{n.message}</p>}
                  <p style={{ fontSize: 11, color: '#8C8275', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString('en-ZA')}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="px-3 py-1 text-xs rounded"
                    style={{border:'1px solid #3A3428',color:'#A09888',background:'transparent',cursor:'pointer',fontFamily:'Inter, sans-serif'}}
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
