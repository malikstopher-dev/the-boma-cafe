'use client'

import { ReactNode, useEffect, useCallback } from 'react'

interface PosModalProps {
  open: boolean
  onClose: () => void
  title?: string
  icon?: string
  children: ReactNode
  maxWidth?: string
}

export default function PosModal({
  open,
  onClose,
  title,
  icon,
  children,
  maxWidth = '440px',
}: PosModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'pos-fade-in 0.2s ease',
        padding: 'var(--pos-space-lg)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'pos-modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--pos-surface)',
          borderRadius: 'var(--pos-radius-xl)',
          border: '1px solid var(--pos-border-light)',
          boxShadow: 'var(--pos-shadow-lg)',
          width: '100%',
          maxWidth,
          maxHeight: '85vh',
          overflow: 'auto',
          animation: 'pos-scale-in 0.2s ease',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--pos-space-xl) var(--pos-space-2xl)',
              borderBottom: '1px solid var(--pos-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {icon && <span style={{ fontSize: '1.3rem' }}>{icon}</span>}
              <h2 id="pos-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--pos-text)', margin: 0 }}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--pos-text-muted)',
                fontSize: '1.4rem',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
                borderRadius: 'var(--pos-radius-sm)',
                transition: 'color var(--pos-transition)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--pos-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--pos-text-muted)' }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--pos-space-2xl)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
