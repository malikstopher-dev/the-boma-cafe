'use client'

export default function ErrorView({ message }: { message: string }) {
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
        </div>
      </div>
    </div>
  )
}
