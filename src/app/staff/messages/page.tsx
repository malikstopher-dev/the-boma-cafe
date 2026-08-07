'use client'

import { useState, useEffect } from 'react'
import { ConversationList, ChatWindow } from '@/components/chat'

interface StaffProfile {
  id: string
  user_id: string
  name: string
  role: string
}

export default function StaffMessagesPage() {
  const [staffProfiles, setStaffProfiles] = useState<Record<string, { name: string; role: string }>>({})
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserTextId, setCurrentUserTextId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Load current user from staff session
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/staff/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated && data.staff) {
            setCurrentUserId(data.staff.id)
            setCurrentUserTextId(data.staff.employee_id || data.staff.id)
            setCurrentUserName(data.staff.name)

            // Add role-based virtual users to profiles so conversation names resolve
            const roleProfiles: Record<string, { name: string; role: string }> = {
              ADMIN: { name: 'Admin', role: 'admin' },
              KITCHEN: { name: 'Kitchen', role: 'kitchen' },
              BAR: { name: 'Bar', role: 'bar' },
              WAITER: { name: 'Waiter', role: 'waiter' },
            }
            setStaffProfiles(prev => ({ ...roleProfiles, ...prev }))
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }
    loadUser()
  }, [])

  // Load staff profiles + role-based virtual contacts
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const res = await fetch('/api/staff/list')
        if (res.ok) {
          const data = await res.json()
          const profiles: Record<string, { name: string; role: string }> = {}
          const list: StaffProfile[] = []

          // Add role-based virtual contacts so staff can message admin/kitchen/bar
          const roleContacts: StaffProfile[] = [
            { id: 'role-admin-001', user_id: 'ADMIN', name: '🛡️ Admin', role: 'admin' },
            { id: 'role-kitchen-001', user_id: 'KITCHEN', name: '👨‍🍳 Kitchen', role: 'kitchen' },
            { id: 'role-bar-001', user_id: 'BAR', name: '🍸 Bar', role: 'bar' },
            { id: 'role-waiter-001', user_id: 'WAITER', name: '📋 Waiter Station', role: 'waiter' },
          ]
          for (const rc of roleContacts) {
            profiles[rc.user_id] = { name: rc.name, role: rc.role }
            profiles[rc.id] = { name: rc.name, role: rc.role }
            list.push(rc)
          }

          for (const s of data.staff || []) {
            profiles[s.id] = { name: s.name, role: s.role }
            if (s.user_id && s.user_id !== s.id) profiles[s.user_id] = { name: s.name, role: s.role }
            if (s.employee_id && s.employee_id !== s.id) profiles[s.employee_id] = { name: s.name, role: s.role }
            list.push({ id: s.id, user_id: s.user_id || s.employee_id || s.id, name: s.name, role: s.role })
          }
          setStaffProfiles(profiles)
          setStaffList(list)
        }
      } catch { /* ignore */ }
    }
    loadProfiles()
  }, [])

  // Create new conversation
  const handleCreateConversation = async () => {
    if (selectedStaff.length < 1) {
      setError('Select at least one staff member')
      return
    }

    // Use user_id (TEXT) for conversation membership
    const selectedStaffUserIds = staffList
      .filter(s => selectedStaff.includes(s.id))
      .map(s => s.user_id)
    const memberIds = [currentUserTextId, ...selectedStaffUserIds]
    try {
      const res = await fetch('/api/staff/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_ids: memberIds }),
      })
      if (res.ok) {
        const conv = await res.json()
        setSelectedConversation(conv.id)
        setShowNewChat(false)
        setSelectedStaff([])
      }
    } catch {
      setError('Failed to create conversation')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh', color: 'rgba(255,255,255,0.3)' }}>
        Loading...
      </div>
    )
  }

  if (!currentUserTextId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh', color: 'rgba(255,255,255,0.4)', padding: '2rem', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <p>Please sign in to access messages.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100dvh - 100px)', display: 'flex', background: '#0f0f1a', overflow: 'hidden' }}>
      {/* Left: Conversation list */}
      <div style={{
        width: selectedConversation ? '0px' : '100%',
        minWidth: selectedConversation ? '0px' : '100%',
        borderRight: selectedConversation ? 'none' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>💬 Messages</span>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid #f59e0b', background: showNewChat ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {showNewChat ? '← Back' : '+ New Chat'}
          </button>
        </div>

        {showNewChat ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>Select staff to chat with:</p>
            {staffList.filter(s => s.id !== currentUserId).map(staff => (
              <label key={staff.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 8, cursor: 'pointer',
                background: selectedStaff.includes(staff.id) ? 'rgba(245,158,11,0.1)' : 'transparent',
                marginBottom: 4, color: selectedStaff.includes(staff.id) ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>
                <input
                  type="checkbox"
                  checked={selectedStaff.includes(staff.id)}
                  onChange={e => {
                    if (e.target.checked) setSelectedStaff(prev => [...prev, staff.id])
                    else setSelectedStaff(prev => prev.filter(id => id !== staff.id))
                  }}
                  style={{ accentColor: '#f59e0b' }}
                />
                <span style={{ fontSize: 14 }}>{staff.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{staff.role}</span>
              </label>
            ))}
            <button
              onClick={handleCreateConversation}
              disabled={selectedStaff.length === 0}
              style={{
                width: '100%', marginTop: 12, padding: '10px 16px', borderRadius: 8,
                border: 'none', background: selectedStaff.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.05)',
                color: selectedStaff.length > 0 ? '#000' : 'rgba(255,255,255,0.3)',
                fontSize: 14, fontWeight: 600, cursor: selectedStaff.length > 0 ? 'pointer' : 'default',
              }}
            >
              Start Chat
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {currentUserTextId && (
              <ConversationList
                currentUserId={currentUserTextId}
                staffProfiles={staffProfiles}
                onSelect={setSelectedConversation}
                selectedId={selectedConversation || undefined}
                currentUserAliases={[currentUserTextId, currentUserId]}
              />
            )}
          </div>
        )}
      </div>

      {/* Right: Chat window */}
      {selectedConversation && currentUserTextId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setSelectedConversation(null)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px 8px' }}
            >
              ←
            </button>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Back to conversations</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatWindow
              conversationId={selectedConversation}
              currentUserId={currentUserTextId}
              currentUserName={currentUserName}
              staffProfiles={staffProfiles}
              currentUserAliases={[currentUserTextId, currentUserId]}
              onClose={() => setSelectedConversation(null)}
            />
          </div>
        </div>
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.9)', color: '#fff',
          fontSize: 13, fontWeight: 600, zIndex: 100,
        }} onClick={() => setError(null)}>
          {error}
        </div>
      )}
    </div>
  )
}
