'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffHome() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.role === 'admin') router.replace('/staff/admin')
        else if (data.authenticated && data.role === 'kitchen') router.replace('/staff/kitchen')
        else if (data.authenticated && data.role === 'waiter') router.replace('/waiter')
        else router.replace('/staff/login')
      })
      .catch(() => router.replace('/staff/login'))
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60dvh', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
      Redirecting...
    </div>
  )
}
