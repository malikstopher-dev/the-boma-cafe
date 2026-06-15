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
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <BackButton />
        <h1 style={{ fontSize: '2rem', color: 'var(--dark-brown)' }}>Contact Messages</h1>
        <p style={{ color: 'var(--text-light)' }}>{filtered.length} message{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '400px', boxSizing: 'border-box',
            padding: '0.75rem 1rem', borderRadius: '10px',
            border: '2px solid var(--beige-dark)', background: 'var(--white)',
            fontSize: '0.95rem',
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--white)', padding: '3rem', borderRadius: '16px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-light)' }}>
            {messages.length === 0
              ? 'No messages yet. Contact form submissions will appear here.'
              : 'No messages match your search.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map(msg => (
            <div key={msg.id} style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--dark-brown)', marginBottom: '0.25rem' }}>{msg.name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{msg.email} {msg.phone && `• ${msg.phone}`}</p>
                  {msg.subject && (
                    <span style={{
                      display: 'inline-block', marginTop: '0.35rem',
                      padding: '0.15rem 0.5rem', borderRadius: '6px',
                      background: 'rgba(139,92,246,0.1)', color: '#7c3aed',
                      fontSize: '0.8rem', fontWeight: 600,
                    }}>
                      {msg.subject}
                    </span>
                  )}
                </div>
                <button onClick={() => deleteMessage(msg.id)} style={{ padding: '0.5rem 1rem', background: '#fee2e2', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', fontSize: '0.85rem' }}>Delete</button>
              </div>
              <p style={{ color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: '1rem' }}>
                {new Date(msg.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
