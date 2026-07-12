'use client'

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a14', color: '#94A3B8',
          fontFamily: "'Inter', -apple-system, sans-serif",
          padding: 24, textAlign: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 48, opacity: 0.5 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F8F9FB', margin: 0 }}>Something went wrong</h2>
          <p style={{ fontSize: 14, maxWidth: 400, lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{
              padding: '10px 24px', borderRadius: 8, border: '1px solid #2A2E38',
              background: '#1A1D24', color: '#F8F9FB', fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
