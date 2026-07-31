'use client'

import { type ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './DesignSystem.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantMap: Record<ButtonVariant, string> = {
  primary: styles.btnPrimary ?? '',
  secondary: styles.btnSecondary ?? '',
  ghost: styles.btnGhost ?? '',
  danger: styles.btnDanger ?? '',
}

const sizeMap: Record<ButtonSize, string> = {
  sm: styles.btnSm ?? '',
  md: styles.btnMd ?? '',
  lg: styles.btnLg ?? '',
  icon: styles.btnIcon ?? '',
  iconSm: styles.btnIconSm ?? '',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, ...props }, ref) => {
    const classes = [
      styles.btn,
      variantMap[variant],
      sizeMap[size],
      loading ? styles.btnLoading : '',
      className,
    ].filter(Boolean).join(' ')

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
