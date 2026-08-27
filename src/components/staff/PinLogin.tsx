'use client'

import { useState, useEffect } from 'react'
import PinKeypad from './PinKeypad'
import { posTokens as t } from '@/components/pos/DesignSystem'

interface StaffMember {
  id: string
  employee_id?: string
  name: string
  role: string
  has_pin: boolean
}

interface PinLoginProps {
  role?: string
  title?: string
  icon?: string
  onSuccess: (staff: { id: string; name: string; role: string; employee_id: string }) => void
  onCancel?: () => void
}

export default function PinLogin({ role, title = 'Sign In', icon = '👤', onSuccess, onCancel }: PinLoginProps) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [showKeypad, setShowKeypad] = useState(false)

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const url = role ? `/api/staff/list?role=${role}` : '/api/staff/list'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setStaff(data.staff || [])
        }
      } catch {
        console.error('Failed to load staff list')
      } finally {
        setLoading(false)
      }
    }
    loadStaff()
  }, [role])

  const handleStaffSelect = (member: StaffMember) => {
    setSelectedStaff(member)
    setEmployeeId('')
    setError(null)
    setShowKeypad(true)
  }

  const handlePinComplete = async (enteredPin: string) => {
    if (!selectedStaff && !employeeId) {
      setError('Please select your name or enter Employee ID')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/staff/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff?.id,
          employee_id: selectedStaff ? undefined : employeeId,
          pin: enteredPin,
          device_name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Web Browser',
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onSuccess(data.staff)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Invalid PIN')
        setPin('')
      }
    } catch {
      setError('Connection error')
      setPin('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEmployeeIdSubmit = () => {
    if (!employeeId.trim()) {
      setError('Please enter your Employee ID')
      return
    }
    const member = staff.find(s => s.employee_id === employeeId.trim())
    if (member) {
      setSelectedStaff(member)
    }
    setShowKeypad(true)
    setError(null)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: t.colors.bg.primary, gap: 16 }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${t.colors.border.default}`, borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: t.colors.text.muted, fontSize: 14 }}>Loading staff...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', background: t.colors.bg.primary, padding: '24px 24px 40px', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom, 40px)' }}>
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }`}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24, flexShrink: 0 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{icon}</div>
        <h1 style={{ fontSize: 28, fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary, margin: 0, fontFamily: t.typography.fontFamily }}>{title}</h1>
        <p style={{ color: t.colors.text.muted, fontSize: 14, marginTop: 8 }}>Select your name and enter PIN</p>
      </div>

      {!showKeypad ? (
        /* Staff selection */
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Employee ID input */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={employeeId}
                onChange={e => { setEmployeeId(e.target.value.toUpperCase()); setError(null) }}
                placeholder="Employee ID (e.g., W003)"
                onKeyDown={e => { if (e.key === 'Enter') handleEmployeeIdSubmit() }}
                style={{
                  flex: 1, padding: '14px 16px', borderRadius: t.radius.lg,
                  border: `2px solid ${t.colors.border.default}`,
                  background: 'rgba(255,255,255,0.05)', color: t.colors.text.primary,
                  fontSize: 18, fontFamily: t.typography.fontFamilyMono, outline: 'none',
                  textTransform: 'uppercase', letterSpacing: 2,
                }}
              />
              <button
                onClick={handleEmployeeIdSubmit}
                style={{
                  padding: '14px 20px', borderRadius: t.radius.lg,
                  border: 'none', background: '#F59E0B', color: '#000',
                  fontSize: 16, fontWeight: t.typography.fontWeight.bold,
                  cursor: 'pointer', fontFamily: t.typography.fontFamily,
                }}
              >
                →
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: t.colors.border.default }} />
            <span style={{ color: t.colors.text.dim, fontSize: 12, fontWeight: t.typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>or select name</span>
            <div style={{ flex: 1, height: 1, background: t.colors.border.default }} />
          </div>

          {/* Staff grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            {staff.map(member => (
              <button
                key={member.id}
                onClick={() => handleStaffSelect(member)}
                disabled={!member.has_pin}
                style={{
                  padding: '16px 12px', borderRadius: t.radius.lg,
                  border: `1px solid ${t.colors.border.default}`,
                  background: member.has_pin ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  color: t.colors.text.primary,
                  cursor: member.has_pin ? 'pointer' : 'not-allowed',
                  opacity: member.has_pin ? 1 : 0.4,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  fontFamily: t.typography.fontFamily,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (member.has_pin) {
                    const el = e.currentTarget as any
                    el.style.borderColor = '#F59E0B'
                    el.style.background = 'rgba(245,158,11,0.08)'
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as any
                  el.style.borderColor = t.colors.border.default
                  el.style.background = member.has_pin ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'
                }}
              >
                <span style={{ fontSize: 24 }}>
                  {member.role === 'waiter' ? '👤' : member.role === 'kitchen' ? '👨‍🍳' : member.role === 'bar' ? '🍸' : '👤'}
                </span>
                <span style={{ fontSize: 14, fontWeight: t.typography.fontWeight.semibold }}>{member.name}</span>
              </button>
            ))}
          </div>

          {staff.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: t.colors.text.dim }}>
              <p>No staff members found</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Ask your manager to create staff accounts</p>
            </div>
          )}

          {onCancel && (
            <button onClick={onCancel} style={{ width: '100%', marginTop: 16, padding: 12, borderRadius: t.radius.lg, border: `1px solid ${t.colors.border.default}`, background: 'transparent', color: t.colors.text.muted, fontSize: 14, cursor: 'pointer', fontFamily: t.typography.fontFamily }}>
              ← Back
            </button>
          )}
        </div>
      ) : (
        /* PIN entry */
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Selected staff info */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32,
            padding: '12px 20px', borderRadius: t.radius.lg,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <span style={{ fontSize: 28 }}>
              {selectedStaff?.role === 'waiter' ? '👤' : selectedStaff?.role === 'kitchen' ? '👨‍🍳' : selectedStaff?.role === 'bar' ? '🍸' : '👤'}
            </span>
            <div>
              <div style={{ fontSize: 18, fontWeight: t.typography.fontWeight.bold, color: t.colors.text.primary }}>{selectedStaff?.name || employeeId}</div>
              {selectedStaff?.employee_id && (
                <div style={{ fontSize: 12, color: t.colors.text.dim, fontFamily: t.typography.fontFamilyMono }}>{selectedStaff.employee_id}</div>
              )}
            </div>
            <button
              onClick={() => { setShowKeypad(false); setSelectedStaff(null); setPin(''); setError(null) }}
              style={{ marginLeft: 'auto', padding: 8, borderRadius: t.radius.sm, border: 'none', background: 'transparent', color: t.colors.text.muted, fontSize: 18, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* PIN keypad */}
          <PinKeypad
            pinLength={6}
            onPinComplete={handlePinComplete}
            disabled={submitting}
            error={error}
            onClearError={() => setError(null)}
          />

          {/* Submitting indicator */}
          {submitting && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${t.colors.border.default}`, borderTopColor: '#F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ color: t.colors.text.muted, fontSize: 13 }}>Verifying...</span>
            </div>
          )}

          {/* Cancel */}
          <button
            onClick={() => { setShowKeypad(false); setSelectedStaff(null); setPin(''); setError(null) }}
            style={{ marginTop: 16, padding: '8px 16px', borderRadius: t.radius.sm, border: 'none', background: 'transparent', color: t.colors.text.dim, fontSize: 13, cursor: 'pointer', fontFamily: t.typography.fontFamily }}
          >
            ← Choose different name
          </button>
        </div>
      )}
    </div>
  )
}
