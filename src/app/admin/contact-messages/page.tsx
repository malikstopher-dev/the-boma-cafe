'use client'

import BackButton from '@/components/admin/BackButton'
import { useState, useEffect, useMemo } from 'react'

interface ContactMessage {
  id: string
  name: string
  phone: string | null
  email: string
  subject: string | null
  message: string
  created_at: string
}

export default function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const res = await fetch('/api/supabase/contact')
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Error loading contact messages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return messages
    const q = search.toLowerCase()
    return messages.filter(m =>
      m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    )
  }, [messages, search])

  const deleteMessage = async (id: string) => {
    if (!confirm('Delete this message?')) return
    try {
      const res = await fetch(`/api/supabase/contact?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessages(messages.filter(m => m.id !== id))
      }
    } catch (err) {
      console.error('Error deleting message:', err)
    }
  }

  if (isLoading) {
    return <div style={{ padding: '2rem', color: '#A09888' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ fontSize: 24, color: '#F0EBE3' }}>Contact Messages</h1>
        <p style={{ color: '#A09888' }}>{filtered.length} message{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '400px', boxSizing: 'border-box',
            padding: '0.75rem 1rem', borderRadius: '8px',
            border: '1px solid #3A3428', background: '#2A261E', color: '#F0EBE3',
            fontSize: '0.95rem',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#1E1A14', border: '1px solid #3A3428', padding: '3rem', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#A09888' }}>
            {messages.length === 0
              ? 'No messages yet. Contact form submissions will appear here.'
              : 'No messages match your search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(msg => (
            <div key={msg.id} style={{ background: '#1E1A14', border: '1px solid #3A3428', padding: '1.5rem', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#F0EBE3', marginBottom: '0.25rem' }}>{msg.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: '#A09888' }}>{msg.email} {msg.phone && `• ${msg.phone}`}</p>
                  {msg.subject && (
                    <span style={{
                      display: 'inline-block', marginTop: '0.35rem',
                      padding: '0.15rem 0.5rem', borderRadius: '6px',
                      background: 'rgba(200,160,78,0.08)', color: '#C8A04E',
                      fontSize: '0.8rem', fontWeight: 600,
                    }}>
                      {msg.subject}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteMessage(msg.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(232,84,84,0.08)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#E85454', fontSize: '0.85rem' }}>Delete</button>
              </div>
              <p style={{ color: '#F0EBE3', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              <p style={{ fontSize: '0.8rem', color: '#6B6358', marginTop: '1rem' }}>
                {new Date(msg.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
