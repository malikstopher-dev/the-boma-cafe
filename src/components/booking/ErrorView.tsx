'use client'

export default function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
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
          <h1 style={{ fontSize: '1.5rem', color: 'var(--heading)', marginBottom: '0.5rem' }}>Book Your Event</h1>
          <p style={{ color: 'var(--muted)' }}>{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: '1rem',
                border: 0,
                borderRadius: '10px',
                padding: '0.7rem 1.2rem',
                background: 'var(--primary)',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
