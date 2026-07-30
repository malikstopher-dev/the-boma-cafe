import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
      fontFamily: 'var(--font-body), sans-serif',
      color: '#f5e6d3',
      backgroundColor: '#1a0f0a',
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display), serif',
        fontSize: '4rem',
        fontWeight: 700,
        color: '#d4a853',
        margin: 0,
        lineHeight: 1,
      }}>
        404
      </h1>
      <p style={{
        fontSize: '1.25rem',
        marginTop: '1rem',
        marginBottom: '0.5rem',
        color: '#f5e6d3',
      }}>
        Page not found
      </p>
      <p style={{
        fontSize: '0.95rem',
        color: '#a08060',
        marginBottom: '2rem',
        maxWidth: '480px',
      }}>
        The page you are looking for may have moved or no longer exists.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          backgroundColor: '#d4a853',
          color: '#1a0f0a',
          fontWeight: 600,
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '0.95rem',
          transition: 'opacity 0.2s',
        }}
      >
        Return Home
      </Link>
    </div>
  )
}