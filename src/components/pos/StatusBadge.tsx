import { OrderStatus } from '@/lib/pos/types'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'NEW',         color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', icon: 'N' },
  confirmed:  { label: 'CONFIRMED',   color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  icon: 'C' },
  preparing:  { label: 'PREPARING',   color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',   icon: 'P' },
  packing:    { label: 'PACKING',     color: '#a78bfa', bg: 'rgba(167,139,250,0.15)',  icon: 'P' },
  ready:      { label: 'READY',       color: '#34d399', bg: 'rgba(52,211,153,0.15)',  icon: 'R' },
  served:     { label: 'SERVED',      color: '#22d3ee', bg: 'rgba(34,211,238,0.15)',   icon: 'S' },
  completed:  { label: 'COMPLETED',   color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: 'D' },
  cancelled:  { label: 'CANCELLED',   color: '#f87171', bg: 'rgba(248,113,113,0.15)',   icon: 'X' },
  rejected:   { label: 'REJECTED',    color: '#f87171', bg: 'rgba(248,113,113,0.15)',   icon: 'X' },
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
