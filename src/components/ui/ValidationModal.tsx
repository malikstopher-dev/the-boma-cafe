'use client'

import { useEffect } from 'react'

export interface ValidationError {
  field: string
  message: string
}

interface ValidationModalProps {
  open: boolean
  title: string
  errors: ValidationError[]
  onClose: () => void
  onFixField?: (field: string) => void
}

const FIELD_LABELS: Record<string, { label: string; icon: string }> = {
  name: { label: 'Your Name', icon: '👤' },
  phone: { label: 'Phone Number', icon: '📞' },
  tableNumber: { label: 'Table Number', icon: '🪑' },
  table_number: { label: 'Table Number', icon: '🪑' },
  deliveryAddress: { label: 'Delivery Address', icon: '📍' },
  delivery_address: { label: 'Delivery Address', icon: '📍' },
  waiterName: { label: 'Waiter Name', icon: '🧑‍💼' },
  waiter_name: { label: 'Waiter Name', icon: '🧑‍💼' },
  items: { label: 'Cart', icon: '🛒' },
  orderType: { label: 'Order Method', icon: '📋' },
  order_type: { label: 'Order Method', icon: '📋' },
}

export default function ValidationModal({ open, title, errors, onClose, onFixField }: ValidationModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(4px)',
        animation: 'valFadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFFFFF', borderRadius: 16, padding: 0,
          width: '100%', maxWidth: 440, maxHeight: '90vh',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'valSlideUp 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
          }}>
            ⚠️
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
              {title}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
              Please fix the following to continue
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              width: 32, height: 32, borderRadius: '50%', fontSize: 18,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Error list */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: '60vh' }}>
          {errors.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, textAlign: 'center', padding: 24 }}>
              No issues found.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {errors.map((err, i) => {
                const meta = FIELD_LABELS[err.field] || { label: err.field, icon: '📝' }
                return (
                  <li
                    key={i}
                    onClick={() => {
                      if (onFixField) onFixField(err.field)
                      onClose()
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 10,
                      background: '#fef2f2', border: '1px solid #fecaca',
                      cursor: onFixField ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (onFixField) e.currentTarget.style.background = '#fee2e2' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2' }}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 2 }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.4 }}>
                        {err.message}
                      </div>
                    </div>
                    {onFixField && (
                      <span style={{ color: '#dc2626', fontSize: 18, flexShrink: 0 }}>→</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#f9fafb',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: '#0F766E', color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Got it
          </button>
        </div>
      </div>

      <style>{`
        @keyframes valFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes valSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
