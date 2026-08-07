'use client'

import VoicePlayer from './VoicePlayer'

interface MessageBubbleProps {
  message: {
    id: string
    sender_id: string
    message: string | null
    message_type: 'text' | 'voice' | 'system'
    voice_url: string | null
    voice_duration: number | null
    created_at: string
  }
  isOwn: boolean
  senderName?: string
}

export default function MessageBubble({ message, isOwn, senderName }: MessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
  const senderInitial = senderName ? Array.from(senderName.trim())[0]?.toUpperCase() || '?' : '?'

  if (message.message_type === 'system') {
    return (
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F3F7', padding: '4px 12px', borderRadius: 12 }}>
          {message.message}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 4,
    }}>
      {/* Avatar (for non-own messages) */}
      {!isOwn && senderName && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: '#ECFDF5', color: '#0F766E',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {senderInitial}
        </div>
      )}

      <div style={{ maxWidth: '75%' }}>
        {/* Sender name (for non-own messages) */}
        {!isOwn && senderName && (
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2, paddingLeft: 4 }}>
            {senderName}
          </div>
        )}

        {/* Message bubble */}
        <div style={{
          padding: message.message_type === 'voice' ? '8px 10px' : '10px 14px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOwn ? '#0F766E' : '#FFFFFF',
          color: isOwn ? '#FFFFFF' : '#0F172A',
          border: isOwn ? 'none' : '1px solid #E5E7EB',
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {message.message_type === 'voice' && message.voice_url ? (
            <VoicePlayer url={message.voice_url} duration={message.voice_duration || undefined} />
          ) : (
            <span>{message.message}</span>
          )}
        </div>

        {/* Time */}
        <div style={{
          fontSize: 11,
          color: '#94A3B8',
          marginTop: 2,
          paddingLeft: isOwn ? 0 : 4,
          paddingRight: isOwn ? 4 : 0,
          textAlign: isOwn ? 'right' : 'left',
        }}>
          {time}
        </div>
      </div>
    </div>
  )
}
