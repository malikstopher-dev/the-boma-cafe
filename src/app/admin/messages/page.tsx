'use client'

import { useState, useEffect } from 'react'
import AdminPage from '@/components/admin/design-system/AdminPage'
import { ConversationList, ChatWindow } from '@/components/chat'
import { useToast } from '@/components/admin/design-system/Toast'

interface StaffProfile {
  id: string
  user_id: string
  name: string
  role: string
}

export default function AdminMessagesPage() {
  const [staffProfiles, setStaffProfiles] = useState<Record<string, { name: string; role: string }>>({})
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentUserTextId, setCurrentUserTextId] = useState<string>('')
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [showNewChat, setShowNewChat] = useState(false)
  const [staffList, setStaffList] = useState<StaffProfile[]>([])
  const [selectedStaff, setSelectedStaff] = useState<string[]>([])
  const { error: showError } = useToast()

  // Load current user info
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/staff/session')
        if (res.ok) {
          const data = await res.json()
          if (data.authenticated) {
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

          // Add role-based virtual contacts so admin/bar/kitchen can message each other
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
      showError('Select at least one staff member')
      return
    }

    // Use user_id (TEXT) for conversation membership, not id (UUID)
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
      showError('Failed to create conversation')
    }
  }

  return (
    <AdminPage title="Messages" description="Chat with staff">

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#1E1A14', borderRadius: 12, border: '1px solid #3A3428' }}>
        {/* Left: Conversation list */}
        <div style={{
          width: 320, borderRight: '1px solid #3A3428', display: 'flex', flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #3A3428' }}>
            <button
              onClick={() => setShowNewChat(!showNewChat)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                border: '1px solid #C8A04E', background: showNewChat ? '#242018' : 'transparent',
                color: '#C8A04E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {showNewChat ? '← New Chat' : '💬 My Conversations'}
            </button>
          </div>

          {showNewChat ? (
            /* Conversation list */
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
          ) : (
            /* Staff list (default — click to start a conversation) */
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {staffList.filter(s => s.id !== currentUserId).length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#A09888' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                  <p>No staff found</p>
                </div>
              ) : (
                staffList
                  .filter(s => s.id !== currentUserId)
                  .map(staff => (
                    <button
                      key={staff.id}
                      onClick={async () => {
                        // Create or open a 1-on-1 conversation with this staff member
                        const memberIds = [currentUserTextId, staff.user_id]
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
                          }
                        } catch {
                          showError('Failed to create conversation')
                        }
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 16px', border: 'none', background: 'transparent',
                        borderBottom: '1px solid #2A261E', cursor: 'pointer',
                        textAlign: 'left', width: '100%',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: '#242018', color: '#C8A04E',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                      }}>
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3' }}>
                          {staff.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#A09888' }}>{staff.role}</div>
                      </div>
                    </button>
                  ))
              )}
            </div>
          )}
        </div>

        {/* Right: Chat window */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedConversation && currentUserTextId ? (
            <ChatWindow
              conversationId={selectedConversation}
              currentUserId={currentUserTextId}
              currentUserName={currentUserName}
              staffProfiles={staffProfiles}
              currentUserAliases={[currentUserTextId, currentUserId]}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A09888' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
                <p style={{ fontSize: 16, fontWeight: 600 }}>Select a conversation</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Or start a new chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  )
}
