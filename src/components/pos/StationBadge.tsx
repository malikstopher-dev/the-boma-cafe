import { Station } from '@/lib/pos/types'

interface StationBadgeProps {
  station: Station
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const STATION_CONFIG: Record<Station, { label: string; icon: string; color: string; bg: string }> = {
  kitchen: { label: 'Kitchen', icon: '🍳', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  bar:     { label: 'Bar',     icon: '🍸', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

const SIZE_MAP = {
  sm: { padding: '2px 6px', fontSize: '0.65rem', gap: '3px' },
  md: { padding: '4px 10px', fontSize: '0.75rem', gap: '4px' },
  lg: { padding: '6px 14px', fontSize: '0.85rem', gap: '5px' },
}

export default function StationBadge({ station, size = 'md', className }: StationBadgeProps) {
  const config = STATION_CONFIG[station]
  const sizeStyle = SIZE_MAP[size]

  return (
    <span
      className={className}
      role="status"
      aria-label={`Station: ${config.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase' as const,
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

export { STATION_CONFIG }
