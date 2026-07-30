'use client'

import styles from './DesignSystem.module.css'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'kitchen' | 'bar'

const variantMap: Record<BadgeVariant, string> = {
  default: styles.badgeDefault,
  success: styles.badgeSuccess,
  warning: styles.badgeWarning,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  accent: styles.badgeAccent,
  kitchen: styles.badgeKitchen,
  bar: styles.badgeBar,
}

export default function Badge({ variant = 'default', children, className }: {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={`${styles.badge} ${variantMap[variant]} ${className ?? ''}`.trim()}>
      {children}
    </span>
  )
}

export function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: 'warning', label: 'NEW' },
    confirmed: { variant: 'info', label: 'CONFIRMED' },
    preparing: { variant: 'accent', label: 'PREPARING' },
    packing: { variant: 'warning', label: 'PACKING' },
    ready: { variant: 'success', label: 'READY' },
    served: { variant: 'info', label: 'SERVED' },
    completed: { variant: 'default', label: 'COMPLETED' },
    cancelled: { variant: 'danger', label: 'CANCELLED' },
    rejected: { variant: 'danger', label: 'REJECTED' },
  }
  const config = map[status] || { variant: 'default' as BadgeVariant, label: status.toUpperCase() }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
