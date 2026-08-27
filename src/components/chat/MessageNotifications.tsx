'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CHAT_NOTIFICATION_EVENTS, subscribeToChatEvents } from '@/inventory/lib/chat-events'

export function playMessageTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.value = 880
    osc2.type = 'sine'
    osc2.frequency.value = 1320

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.35)
    osc2.stop(now + 0.35)
  } catch { /* audio not available */ }
}

export interface IncomingToast {
  id: string
  sender: string
  message: string
  conversationId: string
  messageType: 'text' | 'voice' | 'system'
  createdAt: string
}

export function useIncomingMessageNotifications(options: {
  currentUserId: string
  soundEnabled?: boolean
  onNewMessage?: (msg: IncomingToast) => void
}) {
  const { currentUserId, soundEnabled = true, onNewMessage } = options
  const seenIdsRef = useRef<Set<string>>(new Set())
  const audioUnlockedRef = useRef(false)
  const profileMapRef = useRef<Record<string, string>>({})

  const ROLE_DISPLAY_NAMES: Record<string, string> = {
    ADMIN: 'Admin',
    KITCHEN: 'Kitchen',
    BAR: 'Bar',
    WAITER: 'Waiter',
  }

  // Load staff profile names once so toasts can show who sent the message
  useEffect(() => {
    let cancelled = false
    fetch('/api/staff/list')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data) return
        const map: Record<string, string> = {}
        for (const s of data.staff || []) {
          if (s.id) map[s.id] = s.name
          if (s.user_id) map[s.user_id] = s.name
          if (s.employee_id) map[s.employee_id] = s.name
        }
        profileMapRef.current = map
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const resolveSenderName = useCallback((senderId: string) => {
    return profileMapRef.current[senderId] || ROLE_DISPLAY_NAMES[senderId] || senderId
  }, [])

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (audioUnlockedRef.current) return
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const buf = ctx.createBuffer(1, 1, 22050)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start(0)
        audioUnlockedRef.current = true
      } catch { /* */ }
    }
    window.addEventListener('click', unlock, { once: true })
    window.addEventListener('touchstart', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('click', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    const handleNew = (msg: any) => {
      if (!msg || msg.sender_id === currentUserId) return
      if (seenIdsRef.current.has(msg.id)) return
      seenIdsRef.current.add(msg.id)

      if (soundEnabled) playMessageTone()

      onNewMessage?.({
        id: msg.id,
        sender: resolveSenderName(msg.sender_id),
        message: msg.message_type === 'voice' ? '🎤 Voice message' : (msg.message || ''),
        conversationId: msg.conversation_id,
        messageType: msg.message_type || 'text',
        createdAt: msg.created_at,
      })
    }

    // E1-5: staff_messages is RLS-blocked for the anon browser key, so the
    // old postgres_changes channel on that table never fired. Consume the
    // anon-readable realtime_events signal table (migration 093) and fetch
    // the message by id — payloads never carry message content (E1-5).
    const sub = subscribeToChatEvents({
      channel: `e1-incoming-${currentUserId}`,
      events: CHAT_NOTIFICATION_EVENTS,
      scopeId: currentUserId,
      onMessageId: (messageId) => {
        if (!messageId) return
        fetch(`/api/staff/messages?message_id=${encodeURIComponent(messageId)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((msg: any) => {
            if (msg) handleNew(msg)
          })
          .catch(() => {})
      },
    })

    return () => { sub.unsubscribe() }
  }, [currentUserId, soundEnabled, onNewMessage, resolveSenderName])
}

interface MessageToastContainerProps {
  toasts: IncomingToast[]
  onDismiss: (id: string) => void
  onClick: (conversationId: string) => void
}

export function MessageToastContainer({ toasts, onDismiss, onClick }: MessageToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8,
      maxWidth: 340, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => { onClick(t.conversationId); onDismiss(t.id) }}
          style={{
            pointerEvents: 'auto', cursor: 'pointer',
            background: '#1A1D24', borderRadius: 12, padding: '12px 14px',
            border: '1px solid rgba(245,158,11,0.3)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'msgSlideIn 0.3s ease-out',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(245,158,11,0.2)', color: '#f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>
            💬
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 2 }}>
              New message from {t.sender}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.message}
            </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onDismiss(t.id) }} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
          }}>×</button>
        </div>
      ))}
      <style>{`
        @keyframes msgSlideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
