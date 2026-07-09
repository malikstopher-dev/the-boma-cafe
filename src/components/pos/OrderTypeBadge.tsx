import { OrderType } from '@/lib/pos/types'

interface OrderTypeBadgeProps {
  type: OrderType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const TYPE_CONFIG: Record<OrderType, { label: string; icon: string; color: string; bg: string }> = {
  'dine-in':  { label: 'Dine-in',  icon: '🍽️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  delivery:   { label: 'Delivery',  icon: '🛵', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  pickup:     { label: 'Takeaway',  icon: '🥡', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
}

const SIZE_MAP = {
  sm: { padding: '2px 6px', fontSize: '0.65rem', gap: '3px' },
  md: { padding: '4px 10px', fontSize: '0.75rem', gap: '4px' },
  lg: { padding: '6px 14px', fontSize: '0.85rem', gap: '5px' },
}

export default function OrderTypeBadge({ type, size = 'md', className }: OrderTypeBadgeProps) {
  const config = TYPE_CONFIG[type]
  const sizeStyle = SIZE_MAP[size]

  return (
    <span
      className={className}
      role="status"
      aria-label={`Order type: ${config.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        borderRadius: 'var(--pos-radius-sm)',
        border: `1px solid ${config.color}30`,
        whiteSpace: 'nowrap' as const,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: '0.9em' }}>{config.icon}</span>
      {config.label}
    </span>
  )
}

export { TYPE_CONFIG }
