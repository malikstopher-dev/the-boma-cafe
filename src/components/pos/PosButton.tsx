import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'warning' | 'success'
type ButtonSize = 'sm' | 'md' | 'lg'

interface PosButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  fullWidth?: boolean
  loading?: boolean
  ariaLabel?: string
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary:   { bg: '#10b981', color: '#000', border: 'none',           hoverBg: '#059669' },
  secondary: { bg: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', hoverBg: 'rgba(255,255,255,0.08)' },
  danger:    { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', hoverBg: 'rgba(239,68,68,0.25)' },
  ghost:     { bg: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)', hoverBg: 'rgba(255,255,255,0.05)' },
  warning:   { bg: '#f59e0b', color: '#000', border: 'none',           hoverBg: '#d97706' },
  success:   { bg: '#10b981', color: '#000', border: 'none',           hoverBg: '#059669' },
}

const SIZE_STYLES: Record<ButtonSize, { height: string; padding: string; fontSize: string; borderRadius: string }> = {
  sm: { height: '40px', padding: '0 12px', fontSize: '0.8rem', borderRadius: 'var(--pos-radius-md)' },
  md: { height: '48px', padding: '0 16px', fontSize: '0.9rem', borderRadius: 'var(--pos-radius-md)' },
  lg: { height: '56px', padding: '0 24px', fontSize: '1rem',   borderRadius: 'var(--pos-radius-lg)' },
}

export default function PosButton({
  variant = 'primary',
  size = 'lg',
  icon,
  fullWidth = false,
  loading = false,
  disabled,
  style,
  children,
  ariaLabel,
  ...props
}: PosButtonProps) {
  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]

  return (
    <button
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      disabled={disabled || loading}
      tabIndex={0}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 700,
        fontFamily: 'var(--pos-font)',
        color: v.color,
        background: v.bg,
        border: v.border,
        borderRadius: s.borderRadius,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'all var(--pos-transition)',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) e.currentTarget.style.background = v.hoverBg
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) e.currentTarget.style.background = v.bg
      }}
      {...props}
    >
      {loading ? (
        <span style={{ width: '1em', height: '1em', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pos-pulse 0.8s linear infinite' }} />
      ) : icon ? (
        <span style={{ fontSize: '1.1em', lineHeight: 1 }}>{icon}</span>
      ) : null}
      {children}
    </button>
  )
}
