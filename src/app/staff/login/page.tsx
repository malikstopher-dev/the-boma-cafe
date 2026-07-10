'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ROLES = [
  { key: 'admin', label: 'Admin', icon: '⚙️', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', desc: 'Manage orders, staff, and settings' },
  { key: 'kitchen', label: 'Kitchen', icon: '👨‍🍳', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', desc: 'View and process food orders' },
  { key: 'bar', label: 'Bar', icon: '🍸', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', desc: 'View and process drink orders' },
  { key: 'waiter', label: 'Waiter', icon: '📋', color: '#10b981', bg: 'rgba(16,185,129,0.1)', desc: 'Take orders and manage tables' },
]

export default function StaffLogin() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'password'>('role')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) {
          if (data.role === 'admin') router.replace('/staff/admin')
          else if (data.role === 'kitchen') router.replace('/staff/kitchen')
          else if (data.role === 'bar') router.replace('/staff/bar')
          else if (data.role === 'waiter') router.replace('/staff/waiter')
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [router])

  useEffect(() => {
    if (step === 'password') inputRef.current?.focus()
  }, [step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, role: selectedRole }),
      })
      const data = await res.json()
      if (res.ok && (data.authenticated || data.success)) {
        const target = selectedRole === 'admin' ? '/staff/admin' : selectedRole === 'kitchen' ? '/staff/kitchen' : selectedRole === 'bar' ? '/staff/bar' : '/staff/waiter'
        router.replace(target)
        router.refresh()
      } else {
        setError(data?.error || 'Invalid password')
        setPassword('')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: 'rgba(255,255,255,0.4)' }}>
        <span>Checking session...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0f0f1a' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🍽️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>The Boma Café</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>Staff Portal</p>
        </div>

        {step === 'role' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => { setSelectedRole(r.key); setStep('password') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1.25rem', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.06)',
                  background: r.bg, cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left', width: '100%',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{r.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.15rem' }}>
                    {r.desc}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: '1.2rem' }}>→</div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <button
              type="button"
              onClick={() => { setStep('role'); setError(''); setPassword('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
            >
              ← Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{ROLES.find(r => r.key === selectedRole)?.icon}</div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                {ROLES.find(r => r.key === selectedRole)?.label} Login
              </h2>
            </div>

            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                border: '2px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: '1rem', textAlign: 'center', outline: 'none',
                boxSizing: 'border-box',
              }}
              required
            />

            {error && <div style={{ marginTop: '0.75rem', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: '100%', marginTop: '1.25rem', padding: '1rem', border: 'none', borderRadius: '12px',
                background: loading || !password ? 'rgba(255,255,255,0.05)' : '#f59e0b',
                color: loading || !password ? 'rgba(255,255,255,0.3)' : '#000',
                fontSize: '1rem', fontWeight: 700, cursor: loading || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <a href="/staff/install" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            Install Boma Staff App
          </a>
        </div>
      </div>
    </div>
  )
}
