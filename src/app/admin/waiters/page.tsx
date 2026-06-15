'use client'

import { useState, useEffect, useMemo } from 'react'
import BackButton from '@/components/admin/BackButton'

interface Waiter {
  id: string
  name: string
  active: boolean
  created_at: string
}

export default function WaitersPage() {
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const loadWaiters = async () => {
    try {
      const res = await fetch('/api/waiters')
      if (res.ok) setWaiters(await res.json())
    } catch { /* */ }
  }

  useEffect(() => { loadWaiters() }, [])

  const sorted = useMemo(() => {
    let list = [...waiters]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w => w.name.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return list
  }, [waiters, search])

  const addWaiter = async () => {
    const name = newName.trim()
    if (!name) return
    if (waiters.some(w => w.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/waiters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setNewName('')
        await loadWaiters()
      }
    } catch { /* */ } finally { setLoading(false) }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/waiters?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      })
      await loadWaiters()
    } catch { /* */ }
  }

  const updateName = async (id: string) => {
    const name = editName.trim()
    if (!name) {
      setEditId(null)
      return
    }
    if (waiters.some(w => w.id !== id && w.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    try {
      await fetch(`/api/waiters?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      setEditId(null)
      await loadWaiters()
    } catch { /* */ }
  }

  const deleteWaiter = async (id: string) => {
    try {
      const res = await fetch(`/api/waiters?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirm(null)
        await loadWaiters()
      }
    } catch { /* */ }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <BackButton />
      <h1 style={{ fontSize: '1.5rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>Waiters</h1>
      <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {waiters.filter(w => w.active).length} on duty · {waiters.length} total
      </p>

      {/* Add waiter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Add waiter name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addWaiter()}
          style={{
            flex: 1, padding: '0.75rem 1rem', borderRadius: '10px',
            border: '2px solid var(--beige-dark)', fontSize: '1rem',
          }}
        />
        <button
          onClick={addWaiter}
          disabled={loading || !newName.trim()}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: '10px', border: 'none',
            background: loading ? '#ccc' : 'var(--warm)',
            color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          + Add
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search waiter..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: '320px', boxSizing: 'border-box',
            padding: '0.6rem 1rem', borderRadius: '10px',
            border: '2px solid var(--beige-dark)', fontSize: '0.9rem',
          }}
        />
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sorted.length === 0 && (
          <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '2rem' }}>
            {search ? 'No waiters match your search.' : 'No waiters yet. Add one above.'}
          </p>
        )}
        {sorted.map(w => (
          <div
            key={w.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '10px',
              background: '#fff', border: '1px solid var(--beige-dark)',
              opacity: w.active ? 1 : 0.6,
            }}
          >
            {/* Avatar */}
            <span style={{
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem',
              background: w.active ? 'rgba(16,185,129,0.15)' : '#f3f4f6',
              color: w.active ? '#10b981' : '#9ca3af',
            }}>
              {w.name.charAt(0).toUpperCase()}
            </span>

            {/* Name / Edit */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editId === w.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') updateName(w.id)
                    if (e.key === 'Escape') setEditId(null)
                  }}
                  onBlur={() => updateName(w.id)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '0.4rem 0.6rem', borderRadius: '6px',
                    border: '2px solid var(--warm)', fontSize: '0.95rem',
                  }}
                  autoFocus
                />
              ) : (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--dark-brown)', display: 'block' }}>{w.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    Added {new Date(w.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </>
              )}
            </div>

            {/* Status */}
            <span style={{
              fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '6px', flexShrink: 0,
              background: w.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: w.active ? '#10b981' : '#ef4444',
            }}>
              {w.active ? '🟢 ON DUTY' : '🔴 OFF DUTY'}
            </span>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button
                onClick={() => { setEditId(w.id); setEditName(w.name) }}
                title="Edit name"
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid var(--beige-dark)',
                  background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-light)',
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => toggleActive(w.id, w.active)}
                title={w.active ? 'Take off duty' : 'Put on duty'}
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: '6px', border: 'none',
                  background: w.active ? '#fef2f2' : '#f0fdf4',
                  cursor: 'pointer', fontSize: '0.8rem',
                  color: w.active ? '#ef4444' : '#10b981', fontWeight: 600,
                }}
              >
                {w.active ? '🔴' : '🟢'}
              </button>
              <button
                onClick={() => setDeleteConfirm(w.id)}
                title="Delete waiter"
                style={{
                  padding: '0.4rem 0.6rem', borderRadius: '6px', border: 'none',
                  background: '#fef2f2', cursor: 'pointer', fontSize: '0.8rem', color: '#ef4444',
                }}
              >
                🗑️
              </button>
            </div>

            {/* Delete confirmation */}
            {deleteConfirm === w.id && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)',
              }} onClick={() => setDeleteConfirm(null)}>
                <div style={{
                  background: '#fff', padding: '2rem', borderRadius: '16px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxWidth: '380px', width: '90%',
                }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: 'var(--dark-brown)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                    Delete waiter &ldquo;{w.name}&rdquo;?
                  </h3>
                  <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Historical orders will keep the waiter name. They will be removed from future assignment lists.
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid var(--beige-dark)',
                        background: '#fff', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-light)',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => deleteWaiter(w.id)}
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
