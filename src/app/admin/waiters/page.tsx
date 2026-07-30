'use client'

import { useState, useEffect, useMemo } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import Button from '@/components/admin/design-system/Button'
import { Input } from '@/components/admin/design-system/Input'
import Badge from '@/components/admin/design-system/Badge'
import EmptyState from '@/components/admin/design-system/EmptyState'
import ConfirmDialog from '@/components/admin/design-system/ConfirmDialog'
import { useToast } from '@/components/admin/design-system/Toast'

interface Waiter { id: string; name: string; employee_id: string | null; active: boolean; created_at: string }

export default function WaitersPage() {
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [newName, setNewName] = useState('')
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newPin, setNewPin] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Waiter | null>(null)
  const { success, error: showError } = useToast()

  const loadWaiters = async () => {
    try { const res = await fetch('/api/waiters'); if (res.ok) setWaiters(await res.json()) }
    catch { showError('Failed to load waiters') }
  }

  useEffect(() => { loadWaiters() }, [])

  const sorted = useMemo(() => {
    let list = [...waiters]
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(w => w.name.toLowerCase().includes(q)) }
    list.sort((a, b) => { if (a.active !== b.active) return a.active ? -1 : 1; return a.name.localeCompare(b.name) })
    return list
  }, [waiters, search])

  const addWaiter = async () => {
    const name = newName.trim()
    const employeeId = newEmployeeId.trim()
    const pin = newPin.trim()
    if (!name) { showError('Name is required'); return }
    if (!employeeId) { showError('Employee ID is required'); return }
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) { showError('PIN must be 4-6 digits'); return }
    if (waiters.some(w => w.name.toLowerCase() === name.toLowerCase())) { showError('Name already exists'); return }
    if (waiters.some(w => w.employee_id === employeeId)) { showError('Employee ID already exists'); return }
    setIsLoading(true)
    try {
      const res = await fetch('/api/waiters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, employee_id: employeeId, pin }) })
      if (res.ok) { setNewName(''); setNewEmployeeId(''); setNewPin(''); await loadWaiters(); success('Waiter added') }
      else { const data = await res.json().catch(() => ({})); showError(data.error || 'Failed to add waiter') }
    } catch { showError('Failed to add waiter') }
    finally { setIsLoading(false) }
  }

  const toggleActive = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/waiters?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) })
      await loadWaiters(); success(active ? 'Taken off duty' : 'Put on duty')
    } catch { showError('Failed to update') }
  }

  const updateName = async (id: string) => {
    const name = editName.trim()
    if (!name) { setEditId(null); return }
    if (waiters.some(w => w.id !== id && w.name.toLowerCase() === name.toLowerCase())) { showError('Name already exists'); return }
    try {
      await fetch(`/api/waiters?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      setEditId(null); await loadWaiters(); success('Name updated')
    } catch { showError('Failed to update') }
  }

  const deleteWaiter = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/waiters?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) { setDeleteTarget(null); await loadWaiters(); success('Waiter deleted') }
    } catch { showError('Failed to delete') }
  }

  return (
    <AdminPage title="Waiters" description={`${waiters.filter(w => w.active).length} on duty · ${waiters.length} total`}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}>
        <Input placeholder="Employee ID (e.g. W003)" value={newEmployeeId} onChange={e => setNewEmployeeId(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && addWaiter()} />
        <Input placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWaiter()} />
        <Input placeholder="PIN (4-6 digits)" type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={e => e.key === 'Enter' && addWaiter()} />
        <Button variant="primary" onClick={addWaiter} loading={isLoading}>+ Add</Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input placeholder="Search waiter..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {sorted.length === 0 ? <EmptyState icon="👤" title={search ? 'No matches' : 'No waiters yet'} description={search ? 'Try a different search' : 'Add a waiter above'} />
      : (
        <div style={{ display: 'grid', gap: 6 }}>
          {sorted.map(w => (
            <div key={w.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: '#FFFFFF',
              border: '1px solid #E5E7EB', borderRadius: 10,
              opacity: w.active ? 1 : 0.6,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13,
                background: w.active ? 'rgba(16,185,129,0.12)' : '#F1F3F7',
                color: w.active ? '#10B981' : '#94A3B8',
              }}>{w.name.charAt(0).toUpperCase()}</span>

              <div style={{ flex: 1, minWidth: 0 }}>
                {editId === w.id ? (
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') updateName(w.id); if (e.key === 'Escape') setEditId(null) }} onBlur={() => updateName(w.id)} autoFocus style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '2px solid #0F766E', fontSize: 14 }} />
                ) : (
                  <>
                    <span style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, display: 'block' }}>{w.name}</span>
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>
                      {w.employee_id ? `${w.employee_id} · ` : ''}Added {new Date(w.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </>
                )}
              </div>

              <Badge variant={w.active ? 'success' : 'danger'}>{w.active ? 'ON DUTY' : 'OFF DUTY'}</Badge>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Button variant="ghost" size="iconSm" onClick={() => { setEditId(w.id); setEditName(w.name) }} title="Edit">✏️</Button>
                <Button variant="ghost" size="iconSm" onClick={() => toggleActive(w.id, w.active)} title={w.active ? 'Off duty' : 'On duty'}>{w.active ? '🔴' : '🟢'}</Button>
                <Button variant="ghost" size="iconSm" onClick={() => setDeleteTarget(w)} title="Delete" style={{ color: '#EF4444' }}>🗑️</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleteTarget} title={`Delete "${deleteTarget?.name}"?`} message="Historical orders will keep the waiter name. They will be removed from future assignment lists." confirmLabel="Delete" onConfirm={deleteWaiter} onCancel={() => setDeleteTarget(null)} />
    </AdminPage>
  )
}
