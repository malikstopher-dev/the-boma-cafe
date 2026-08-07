'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message: string | null
  message_type: 'text' | 'voice' | 'system'
  voice_url: string | null
  voice_duration: number | null
  read_at: string | null
  created_at: string
}

interface ChatWindowProps {
  conversationId: string
  currentUserId: string
  currentUserName: string
  staffProfiles: Record<string, { name: string; role: string }>
  currentUserAliases?: string[]
  onClose?: () => void
}

export default function ChatWindow({ conversationId, currentUserId, currentUserName, staffProfiles, currentUserAliases, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const aliases = useMemo(
    () => Array.from(new Set(currentUserAliases && currentUserAliases.length > 0 ? currentUserAliases : [currentUserId])),
    [currentUserAliases, currentUserId]
  )

  const isOwnMessage = useCallback((senderId: string) => aliases.includes(senderId), [aliases])

  const resolveSenderName = useCallback((senderId: string) => {
    return staffProfiles[senderId]?.name || senderId
  }, [staffProfiles])

  // Resolve conversation participants so the header shows WHO this chat is with
  useEffect(() => {
    let cancelled = false
    const loadMembers = async () => {
      try {
        const res = await fetch(`/api/staff/conversations?user_id=${encodeURIComponent(currentUserId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const conv = (data || []).find((c: any) => c.id === conversationId)
        if (!conv || !Array.isArray(conv.members)) return
        // Participant = everyone in the thread EXCEPT current user (in any alias form)
        const others = (conv.members as { user_id: string }[])
          .map(m => m.user_id)
          .filter(uid => uid && !aliases.includes(uid))
        setMemberIds(others)
      } catch { /* ignore */ }
    }
    loadMembers()
    return () => { cancelled = true }
  }, [conversationId, currentUserId, aliases])

  const participantNames = useMemo(() => {
    const names = memberIds.map(uid => staffProfiles[uid]?.name || uid)
    if (names.length <= 2) return names.join(', ')
    return `${names[0]}, ${names[1]} +${names.length - 2} others`
  }, [memberIds, staffProfiles])

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/staff/messages?conversation_id=${conversationId}&limit=100`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data)
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
      } finally {
        setLoading(false)
      }
    }
    loadMessages()
  }, [conversationId])

  // Mark messages as read on mount
  useEffect(() => {
    if (!currentUserId) return
    fetch('/api/staff/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, user_id: currentUserId }),
    }).catch(() => {})
  }, [conversationId, currentUserId])

  // Realtime subscription with polling fallback
  useEffect(() => {
    const supabase = createBrowserClient()
    let realtimeDown = false

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/staff/messages?conversation_id=${conversationId}&limit=100`)
        if (res.ok) {
          const data = await res.json()
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id))
            const newMsgs = data.filter((m: ChatMessage) => !existingIds.has(m.id))
            if (newMsgs.length === 0) return prev
            return [...prev, ...newMsgs]
          })
        }
      } catch { /* ignore */ }
    }

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'staff_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMessage
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      .subscribe((status) => {
        realtimeDown = status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'
      })

    const pollInterval = setInterval(loadMessages, realtimeDown ? 3000 : 30000)

    return () => {
      if (channel) supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [conversationId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send text message
  const handleSendText = useCallback(async (text: string) => {
    setSending(true)
    try {
      const res = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: currentUserId,
          message: text,
          message_type: 'text',
        }),
      })
      if (res.ok) {
        const msg = await res.json()
        // Optimistic: add to local state immediately
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } else {
        console.error('Failed to send message')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }, [conversationId, currentUserId])

  // Upload voice and send
  const handleSendVoice = useCallback(async (blob: Blob, duration: number) => {
    setSending(true)
    setError(null)
    try {
      // Upload voice file to Supabase Storage
      const fileName = `voice-${Date.now()}.webm`

      const uploadRes = await fetch('/api/staff/voice-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          file_name: fileName,
          file_type: 'audio/webm',
        }),
      })

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}))
        setError(errData.error || 'Failed to upload voice note')
        return
      }

      const { upload_url, public_url } = await uploadRes.json()

      // Upload the actual file
      const fileUploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/webm' },
        body: blob,
      })

      if (!fileUploadRes.ok) {
        setError('Failed to upload voice file')
        return
      }

      // Send message with voice URL
      const msgRes = await fetch('/api/staff/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: currentUserId,
          message_type: 'voice',
          voice_url: public_url,
          voice_duration: duration,
        }),
      })

      if (msgRes.ok) {
        const msg = await msgRes.json()
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
      } else {
        const errData = await msgRes.json().catch(() => ({}))
        setError(errData.error || 'Failed to send voice message')
      }
    } catch (err) {
      console.error('Failed to send voice:', err)
      setError('Voice upload failed — check connection')
    } finally {
      setSending(false)
    }
  }, [conversationId, currentUserId])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#1A1610', fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#242018',
        borderBottom: '1px solid #3A3428', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#A09888',
              fontSize: 18, cursor: 'pointer', padding: 4,
            }}>←</button>
          )}
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#F0EBE3',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
              {participantNames || 'Chat'}
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div onClick={() => setError(null)} style={{
          padding: '6px 16px', background: 'rgba(239,68,68,0.12)',
          borderBottom: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', fontSize: 13, textAlign: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          {error} (tap to dismiss)
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#A09888' }}>Loading...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#A09888' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <p style={{ color: '#C0B8A8' }}>No messages yet</p>
              <p style={{ fontSize: 12, color: '#6B6358' }}>Send a message to start the conversation</p>
            </div>
          ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={isOwnMessage(msg.sender_id)}
              senderName={resolveSenderName(msg.sender_id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput
        onSendText={handleSendText}
        onSendVoice={handleSendVoice}
        disabled={sending}
      />
    </div>
  )
}
