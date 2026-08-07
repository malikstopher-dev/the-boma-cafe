'use client'

import { useState, useEffect } from 'react'

interface Conversation {
  id: string
  title: string | null
  is_group: boolean
  created_at: string
  members?: { user_id: string }[]
  last_message?: {
    id: string
    message: string | null
    message_type: string
    sender_id: string
    created_at: string
  } | null
}

interface ConversationListProps {
  currentUserId: string
  staffProfiles: Record<string, { name: string; role: string }>
  onSelect: (conversationId: string) => void
  selectedId?: string
  currentUserAliases?: string[]
}

export default function ConversationList({ currentUserId, staffProfiles, onSelect, selectedId, currentUserAliases }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  const aliases = Array.from(new Set(currentUserAliases && currentUserAliases.length > 0 ? currentUserAliases : [currentUserId]))

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const res = await fetch(`/api/staff/conversations?user_id=${currentUserId}`)
        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        }
      } catch (err) {
        console.error('Failed to load conversations:', err)
      } finally {
        setLoading(false)
      }
    }
    loadConversations()
  }, [currentUserId])

  const getConversationName = (conv: Conversation) => {
    if (conv.title) return conv.title
    if (conv.is_group) return 'Group Chat'
    const otherMember = conv.members?.find(m => m.user_id && !aliases.includes(m.user_id))
    return otherMember ? (staffProfiles[otherMember.user_id]?.name || otherMember.user_id) : 'Chat'
  }

  const getLastMessagePreview = (conv: Conversation) => {
    if (!conv.last_message) return 'No messages yet'
    const msg = conv.last_message
    if (msg.message_type === 'voice') return '🎤 Voice message'
    return msg.message?.slice(0, 50) || ''
  }

  const getTimeAgo = (dateStr: string) => {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    const diff = now - then
    if (diff < 60000) return 'now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`
    return `${Math.floor(diff / 86400000)}d`
  }

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {conversations.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94A3B8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
          <p>No conversations yet</p>
        </div>
      ) : (
        conversations.map(conv => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', border: 'none',
              background: selectedId === conv.id ? 'rgba(245,158,11,0.12)' : 'transparent',
              borderBottom: '1px solid rgba(58,52,40,0.6)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 0.15s',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: conv.is_group ? 'rgba(59,130,246,0.18)' : 'rgba(245,158,11,0.18)',
              color: conv.is_group ? '#93C5FD' : '#FBBF24',
              border: conv.is_group ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(245,158,11,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700,
            }}>
              {conv.is_group ? '👥' : (Array.from(getConversationName(conv).trim())[0]?.toUpperCase() || '?')}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getConversationName(conv)}
                </span>
                {conv.last_message && (
                  <span style={{ fontSize: 11, color: '#6B6358', flexShrink: 0, marginLeft: 8 }}>
                    {getTimeAgo(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, color: '#A09888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {getLastMessagePreview(conv)}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
