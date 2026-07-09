'use client'

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const TYPE_CONFIG: Record<ToastType, { color: string; bg: string; icon: string }> = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: '✅' },
  error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  icon: '❌' },
  info:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  icon: 'ℹ️' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '⚠️' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 'var(--pos-space-lg)',
          right: 'var(--pos-space-lg)',
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--pos-space-sm)',
          maxWidth: '380px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          const config = TYPE_CONFIG[toast.type]
          return (
            <div
              key={toast.id}
              role="alert"
              aria-live="polite"
              onClick={() => dismiss(toast.id)}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dismiss(toast.id) }}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'var(--pos-surface)',
                border: `1px solid ${config.color}40`,
                borderRadius: 'var(--pos-radius-md)',
                boxShadow: 'var(--pos-shadow-md)',
                animation: 'pos-slide-in-right 0.3s ease',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1rem' }}>{config.icon}</span>
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 500, color: 'var(--pos-text)' }}>
                {toast.message}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: config.color,
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.05em',
                }}
              >
                {toast.type}
              </span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
