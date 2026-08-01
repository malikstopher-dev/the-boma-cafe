'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import { SkeletonCard } from '@/components/admin/design-system/Skeleton'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog'
import { useToast } from '@/components/admin/design-system/Toast'

interface ContactMessage {
  id: string; name: string; phone: string | null; email: string
  subject: string | null; message: string; is_read: boolean; created_at: string
}

export default function AdminInquiries() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null)
  const { success, error: showError } = useToast()

  useEffect(() => {
    fetch('/api/supabase/contact')
      .then(async r => {
        if (!r.ok) throw new Error('Failed to load messages')
        const data = await r.json()
        if (!Array.isArray(data)) throw new Error('Failed to load messages')
        setMessages(data as ContactMessage[])
      })
      .catch(() => showError('Failed to load messages'))
      .finally(() => setIsLoading(false))
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/supabase/contact?id=${id}`, { method: 'PATCH' })
      if (res.ok) { setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m)); success('Marked as read') }
    } catch { showError('Failed to mark as read') }
  }

  const deleteMessage = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/supabase/contact?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) { setMessages(messages.filter(m => m.id !== deleteTarget.id)); success('Message deleted') }
    } catch { showError('Failed to delete') }
    setDeleteTarget(null)
  }

  const unreadCount = messages.filter(m => !m.is_read).length

  return (
    <AdminPage title="Inquiries" description={`${messages.length} messages · ${unreadCount} unread`}>

      {isLoading ? <div style={{ display: 'grid', gap: 12 }}><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
      : messages.length === 0 ? <EmptyState icon="✉️" title="No messages yet" description="Contact form submissions will appear here" />
      : (
        <div style={{ display: 'grid', gap: 8 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              background: '#1E1A14', border: '1px solid #3A3428', borderRadius: 12, padding: 20,
              borderLeft: msg.is_read ? '1px solid #3A3428' : '4px solid #C8A04E',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#F0EBE3' }}>{msg.name}</span>
                    {!msg.is_read && <Badge variant="accent">New</Badge>}
                    {msg.subject && <Badge variant="default">{msg.subject}</Badge>}
                  </div>
                  <span style={{ fontSize: 13, color: '#6B6358' }}>{msg.email}{msg.phone ? ` · ${msg.phone}` : ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!msg.is_read && <Button variant="ghost" size="sm" onClick={() => markAsRead(msg.id)}>Mark Read</Button>}
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(msg)} style={{ color: '#E85454' }}>Delete</Button>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#A09888', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{msg.message}</p>
              <p style={{ fontSize: 12, color: '#6B6358' }}>
                {new Date(msg.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title="Delete Message" message={`Delete message from "${deleteTarget?.name}"?`} confirmLabel="Delete" onConfirm={deleteMessage} onCancel={() => setDeleteTarget(null)} />
    </AdminPage>
  )
}
