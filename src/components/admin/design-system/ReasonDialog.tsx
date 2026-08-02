'use client'

import { useState } from 'react'
import Button from './Button'
import styles from './DesignSystem.module.css'

export default function ReasonDialog({ open, title, message, reasonLabel = 'Reason for change', reasonPlaceholder = 'e.g. Damaged on delivery, staff countable discrepancy, managerial decision', confirmLabel = 'Confirm', confirmVariant = 'danger', confirmDisabledReason = 'Please enter a reason', onConfirm, onCancel }: {
  open: boolean
  title: string
  message: string
  reasonLabel?: string
  reasonPlaceholder?: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  confirmDisabledReason?: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  if (!open) return null

  const handleConfirm = () => {
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <div className={styles.confirmOverlay} onClick={onCancel}>
      <div className={styles.confirmDialog} onClick={e => e.stopPropagation()}>
        <h3 className={styles.confirmTitle}>{title}</h3>
        <p className={styles.confirmMessage}>{message}</p>
        <div style={{ margin: '1rem 0' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#A09888', marginBottom: '0.35rem' }}>
            {reasonLabel} <span style={{ color: '#E85454' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            autoFocus
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              border: reason.trim() ? '1px solid #3A3428' : '1px solid rgba(232,84,84,0.5)',
              background: '#2A261E',
              color: '#F0EBE3',
              fontSize: '0.85rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              resize: 'vertical',
            }}
          />
        </div>
        <div className={styles.confirmActions}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={confirmVariant} onClick={handleConfirm} disabled={!reason.trim()}>
            {reason.trim() ? confirmLabel : confirmDisabledReason}
          </Button>
        </div>
      </div>
    </div>
  )
}