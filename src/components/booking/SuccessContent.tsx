'use client'

import { formatCurrency } from '@/lib/booking/utils'

const sPage: React.CSSProperties = {
  background: 'var(--beige)',
  minHeight: '100vh',
  paddingBottom: '4rem',
}

const sContainer: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '0 1rem',
}

export default function SuccessContent({
  submitResult,
  email,
  onReset,
  emailSent = false,
}: {
  submitResult: {
    quote_number: string
    quotation: {
      total: number
      deposit_amount: number
      balance_amount: number
    }
  }
  email: string
  onReset: () => void
  emailSent?: boolean
}) {
  return (
    <div style={sPage}>
      <div style={sContainer}>
        <div
          style={{
            maxWidth: 640, margin: '0 auto', padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #A65A1F)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', fontSize: '2.5rem', color: '#fff',
          }}>
            {'\u2713'}
          </div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--heading)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            Quotation Sent!
          </h1>
          <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Reference: <strong>{submitResult.quote_number}</strong>
          </p>
          <p style={{ color: 'var(--body)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
            {'We\'ll review your booking and be in touch within 24 hours.'}
            {emailSent ? <span>{' A copy has been sent to '}{email}.</span> : null}
          </p>
          <div style={{
            background: 'var(--beige)', borderRadius: '16px', padding: '1.5rem',
            marginBottom: '2rem', textAlign: 'left',
          }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--heading)', marginBottom: '1rem' }}>Estimated Total</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--body)' }}>Total</span>
              <strong>{formatCurrency(submitResult.quotation.total)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--body)' }}>Deposit Required (30%)</span>
              <strong style={{ color: 'var(--primary)' }}>{formatCurrency(submitResult.quotation.deposit_amount)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--body)' }}>Balance</span>
              <strong>{formatCurrency(submitResult.quotation.balance_amount)}</strong>
            </div>
          </div>
          <button
            onClick={onReset}
            style={{
              padding: '0.9rem 2rem', borderRadius: '12px', border: '2px solid var(--primary)',
              background: 'transparent', color: 'var(--primary)', fontWeight: 600,
              cursor: 'pointer', fontSize: '0.95rem',
            }}
          >
            Book Another Event
          </button>
        </div>
      </div>
    </div>
  )
}
