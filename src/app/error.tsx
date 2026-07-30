'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled page error:', error)
  }, [error])

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
        fontSize: '2.5rem',
        fontWeight: 700,
        color: '#d4a853',
        margin: 0,
        lineHeight: 1,
      }}>
        Something went wrong
      </h1>
      <p style={{
        fontSize: '1rem',
        marginTop: '1rem',
        marginBottom: '2rem',
        color: '#a08060',
        maxWidth: '480px',
      }}>
        We have been notified and will resolve this shortly. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          backgroundColor: '#d4a853',
          color: '#1a0f0a',
          fontWeight: 600,
          borderRadius: '4px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.95rem',
          fontFamily: 'var(--font-body), sans-serif',
        }}
      >
        Try again
      </button>
    </div>
  )
}