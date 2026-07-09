'use client'

import { useState, useEffect } from 'react'

interface TimerProps {
  startTime: string | Date
  targetMinutes?: number
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function getUrgencyColor(elapsedMs: number, targetMinutes: number): { color: string; bg: string } {
  const targetMs = targetMinutes * 60 * 1000
  const ratio = elapsedMs / targetMs

  if (ratio < 0.7) return { color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
  if (ratio < 1.0) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }
  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
}

const SIZE_MAP = {
  sm: { fontSize: '0.7rem', padding: '2px 6px', gap: '3px' },
  md: { fontSize: '0.8rem', padding: '4px 8px', gap: '4px' },
  lg: { fontSize: '0.9rem', padding: '6px 12px', gap: '5px' },
}

export default function Timer({ startTime, targetMinutes = 15, size = 'md', showIcon = true, className }: TimerProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startTime).getTime())

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(startTime).getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [startTime])

  const urgency = getUrgencyColor(elapsed, targetMinutes)
  const sizeStyle = SIZE_MAP[size]
  const isOverdue = elapsed > targetMinutes * 60 * 1000

  const urgencyLabel = isOverdue ? 'overdue' : elapsed < targetMinutes * 60 * 1000 * 0.7 ? 'on track' : 'approaching limit'

  return (
    <span
      className={className}
      role="timer"
      aria-label={`Time elapsed: ${formatElapsed(elapsed)}. ${urgencyLabel}. Target: ${targetMinutes} minutes.`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 700,
        fontFamily: 'var(--pos-font-mono)',
        color: urgency.color,
        background: urgency.bg,
        borderRadius: 'var(--pos-radius-sm)',
        border: `1px solid ${urgency.color}30`,
        animation: isOverdue ? 'pos-pulse 1.5s ease-in-out infinite' : undefined,
        whiteSpace: 'nowrap' as const,
        lineHeight: 1.4,
      }}
    >
      {showIcon && <span style={{ fontSize: '0.9em' }}>⏱️</span>}
      {formatElapsed(elapsed)}
    </span>
  )
}

export { formatElapsed, getUrgencyColor }
