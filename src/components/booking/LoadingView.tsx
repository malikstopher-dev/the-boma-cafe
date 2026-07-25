'use client'

export default function LoadingView() {
  return (
    <div style={{
      background: 'var(--beige)',
      minHeight: '100vh',
      paddingBottom: '4rem',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 1rem',
      }}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--text-light)' }}>Loading booking system...</p>
        </div>
      </div>
    </div>
  )
}
