'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => {
        try {
          router.back()
        } catch {
          router.push('/admin/dashboard')
        }
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.4rem 0.75rem', borderRadius: '8px',
        border: '1px solid var(--beige-dark)', background: 'var(--white)',
        color: 'var(--text-light)', fontSize: '0.85rem', fontWeight: 500,
        cursor: 'pointer', marginBottom: '1rem',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--warm)'; (e.target as HTMLButtonElement).style.color = 'var(--warm)' }}
      onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = 'var(--beige-dark)'; (e.target as HTMLButtonElement).style.color = 'var(--text-light)' }}
    >
      ← Back
    </button>
  )
}
