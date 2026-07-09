'use client'

import { useState } from 'react'
import PosModal from './PosModal'
import PosButton from './PosButton'

const QUICK_REASONS = [
  'Out of stock',
  'Kitchen closed',
  'Bar item unavailable',
  'Duplicate order',
  'Customer cancelled',
]

interface CancelModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  orderRef?: string
  loading?: boolean
}

export default function CancelModal({ open, onClose, onConfirm, orderRef, loading = false }: CancelModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (reason.trim().length < 3) {
      setError('Reason must be at least 3 characters')
      return
    }
    onConfirm(reason.trim())
  }

  const handleClose = () => {
    setReason('')
    setError('')
    onClose()
  }

  return (
    <PosModal open={open} onClose={handleClose} title="Cancel Order" icon="❌" maxWidth="440px">
      {orderRef && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'var(--pos-card)', borderRadius: 'var(--pos-radius-md)', marginBottom: '1rem', border: '1px solid var(--pos-border)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--pos-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Order</span>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--pos-font-mono)', color: 'var(--pos-text)' }}>{orderRef}</div>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="cancel-reason" style={{ fontSize: '0.8rem', color: 'var(--pos-text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>Reason *</label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="Enter cancellation reason..."
          rows={3}
          aria-required="true"
          aria-invalid={!!error}
          aria-describedby={error ? 'cancel-reason-error' : undefined}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--pos-radius-md)', border: error ? '2px solid #ef4444' : '1px solid var(--pos-border)', background: 'var(--pos-card)', color: 'var(--pos-text)', fontSize: '0.9rem', resize: 'vertical', outline: 'none', fontFamily: 'var(--pos-font)', boxSizing: 'border-box' }}
        />
        {error && <div id="cancel-reason-error" role="alert" style={{ marginTop: '0.3rem', color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--pos-text-dim)', display: 'block', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick reasons</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {QUICK_REASONS.map(r => (
            <button key={r} onClick={() => { setReason(r); setError('') }}
              aria-label={`Quick reason: ${r}`}
              aria-pressed={reason === r}
              style={{ padding: '0.35rem 0.7rem', borderRadius: 'var(--pos-radius-full)', border: reason === r ? '1px solid #ef4444' : '1px solid var(--pos-border)', background: reason === r ? 'rgba(239,68,68,0.15)' : 'var(--pos-card)', color: reason === r ? '#ef4444' : 'var(--pos-text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--pos-font)' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <PosButton variant="danger" fullWidth loading={loading} onClick={handleConfirm}>
          Cancel Order
        </PosButton>
        <PosButton variant="ghost" fullWidth onClick={handleClose}>
          Go Back
        </PosButton>
      </div>
    </PosModal>
  )
}
