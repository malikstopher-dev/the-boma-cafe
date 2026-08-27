'use client'

import { useState, useEffect, useCallback } from 'react'
import { clearOrderQueue, dequeueOrder, getPendingOrders, processQueue, QUEUE_CHANGED_EVENT, retryOrder, type PendingOrder } from '@/lib/offline-queue'

export default function ConnectionStatus() {
  const [online, setOnline] = useState(true)
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [syncing, setSyncing] = useState(false)
  const [queueError, setQueueError] = useState('')
  const refreshQueue = useCallback(() => {
    try {
      setOrders(getPendingOrders())
      setQueueError('')
    } catch (error) {
      setOrders([])
      setQueueError(error instanceof Error ? error.message : 'Offline queue unavailable')
    }
  }, [])

  useEffect(() => {
    const handler = () => {
      setOnline(navigator.onLine)
      if (navigator.onLine) {
        setSyncing(true)
        processQueue().finally(() => {
          setSyncing(false)
          refreshQueue()
        })
      }
    }
    window.addEventListener('online', handler)
    const offlineHandler = () => { setOnline(false); refreshQueue() }
    window.addEventListener('offline', offlineHandler)
    window.addEventListener('storage', refreshQueue)
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshQueue)
    handler()
    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener('offline', offlineHandler)
      window.removeEventListener('storage', refreshQueue)
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshQueue)
    }
  }, [refreshQueue])

  const pending = orders.filter(order => order.status === 'pending').length
  const failed = orders.filter(order => order.status === 'failed')
  if (online && orders.length === 0 && !syncing && !queueError) return null

  return (
    <div style={{
      position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 9999,
      padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: '0.5rem', maxWidth: 420, flexWrap: 'wrap',
      background: failed.length > 0 ? '#7f1d1d' : online ? (syncing ? '#f59e0b' : '#10b981') : '#ef4444',
      color: failed.length > 0 || !online ? '#fff' : '#000',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: online ? '#000' : '#fff', display: 'inline-block' }} />
      {!online && `OFFLINE (${pending} pending)`}
      {online && syncing && `SYNCING...`}
      {online && !syncing && pending > 0 && `${pending} pending`}
      {failed.length > 0 && `${failed.length} need attention`}
      {queueError && (
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
          <span style={{ flex: 1 }}>{queueError}</span>
          <button onClick={() => { clearOrderQueue(); refreshQueue() }}>Clear queue</button>
        </span>
      )}
      {failed.map(order => (
        <span key={order.idempotency_key} style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
          <span style={{ flex: 1 }}>{order.last_error ?? 'Order needs review'}</span>
          <button onClick={() => { retryOrder(order.idempotency_key); refreshQueue(); if (online) void processQueue().finally(refreshQueue) }}>Retry</button>
          <button onClick={() => { dequeueOrder(order.idempotency_key); refreshQueue() }}>Discard</button>
        </span>
      ))}
    </div>
  )
}
