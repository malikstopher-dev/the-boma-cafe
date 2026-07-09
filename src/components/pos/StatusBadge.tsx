import { OrderStatus } from '@/lib/pos/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'NEW',         color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '🆕' },
  confirmed:  { label: 'CONFIRMED',   color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: '✅' },
  preparing:  { label: 'PREPARING',   color: '#eab308', bg: 'rgba(234,179,8,0.15)',   icon: '🔥' },
  packing:    { label: 'PACKING',     color: '#f97316', bg: 'rgba(249,115,22,0.15)',  icon: '📦' },
  ready:      { label: 'READY',       color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '✅' },
  served:     { label: 'SERVED',      color: '#06b6d4', bg: 'rgba(6,182,212,0.15)',   icon: '🍽️' },
  completed:  { label: 'COMPLETED',   color: '#6b7280', bg: 'rgba(107,114,128,0.15)', icon: '✔️' },
  cancelled:  { label: 'CANCELLED',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '❌' },
  rejected:   { label: 'REJECTED',    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '🚫' },
}

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  pulse?: boolean
  className?: string
}

const SIZE_MAP = {
  sm: { padding: '2px 6px', fontSize: '0.65rem', gap: '3px' },
  md: { padding: '4px 10px', fontSize: '0.75rem', gap: '4px' },
  lg: { padding: '6px 14px', fontSize: '0.85rem', gap: '5px' },
}

export default function StatusBadge({ status, size = 'md', showIcon = true, pulse = false, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const sizeStyle = SIZE_MAP[size]

  return (
    <span
      className={className}
      role="status"
      aria-label={`Status: ${config.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        color: config.color,
        background: config.bg,
        borderRadius: 'var(--pos-radius-sm)',
        border: `1px solid ${config.color}30`,
        whiteSpace: 'nowrap' as const,
        animation: pulse ? 'pos-pulse 1.5s ease-in-out infinite' : undefined,
        lineHeight: 1.4,
      }}
    >
      {showIcon && <span style={{ fontSize: '0.9em' }}>{config.icon}</span>}
      {config.label}
    </span>
  )
}

export { STATUS_CONFIG }
