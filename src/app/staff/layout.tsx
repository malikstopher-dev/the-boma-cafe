'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createBrowserClient } from '@/lib/supabase'
import { useIncomingMessageNotifications, MessageToastContainer, type IncomingToast } from '@/components/chat/MessageNotifications'

const FcmRegistration = dynamic(() => import('@/components/staff/FcmRegistration'), { ssr: false })

const NAV_ITEMS: Record<string, { label: string; icon: string; href: string }[]> = {
  admin: [
    { label: 'Dashboard', icon: '📊', href: '/admin/dashboard' },
    { label: 'Orders', icon: '📋', href: '/admin/orders' },
    { label: 'Messages', icon: '💬', href: '/staff/messages' },
    { label: 'Staff', icon: '👥', href: '/staff/admin' },
  ],
  kitchen: [
    { label: 'Orders', icon: '👨‍🍳', href: '/admin/kitchen' },
    { label: 'Messages', icon: '💬', href: '/staff/messages' },
  ],
  bar: [
    { label: 'Orders', icon: '🍸', href: '/admin/bar' },
    { label: 'Messages', icon: '💬', href: '/staff/messages' },
  ],
  waiter: [
    { label: 'Order', icon: '🍽️', href: '/waiter' },
    { label: 'Orders', icon: '📋', href: '/staff/waiter/orders' },
    { label: 'Bookings', icon: '📅', href: '/staff/waiter/bookings' },
    { label: 'Messages', icon: '💬', href: '/staff/messages' },
  ],
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin:  { bg: 'rgba(59,130,246,0.2)',  text: '#60a5fa' },
  kitchen:{ bg: 'rgba(245,158,11,0.2)',  text: '#f59e0b' },
  bar:    { bg: 'rgba(139,92,246,0.2)',  text: '#a78bfa' },
  waiter: { bg: 'rgba(16,185,129,0.2)',  text: '#34d399' },
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [currentUserTextId, setCurrentUserTextId] = useState<string>('')
  const [toasts, setToasts] = useState<IncomingToast[]>([])

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.role) { setAuthed(true); setRole(data.role) }
        else { setAuthed(false); setRole(null) }
      })
      .catch(() => { setAuthed(false) })
      .finally(() => setChecking(false))

    ;(async () => {
      if (!localStorage.getItem('boma_staff_user_id')) {
        const { v4: uuidv4 } = await import('uuid')
        localStorage.setItem('boma_staff_user_id', uuidv4())
      }
    })()
  }, [pathname])

  // Fetch unread message count
  useEffect(() => {
    if (!authed) return
    const fetchUnread = async () => {
      try {
        const sessionRes = await fetch('/api/staff/session')
        if (!sessionRes.ok) return
        const session = await sessionRes.json()
        if (!session.authenticated) return

        const res = await fetch(`/api/staff/conversations?user_id=${session.staff.id}`)
        if (res.ok) {
          const conversations = await res.json()
          const total = conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0)
          setUnreadCount(total)
        }
      } catch { /* ignore */ }
    }
    fetchUnread()

    const supabase = createBrowserClient()
    const channel = supabase
      .channel('staff-nav-unread')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_messages' }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [authed])

  // Get current user text id for incoming message filter
  useEffect(() => {
    if (!authed) return
    fetch('/api/staff/session').then(r => r.json()).then(data => {
      if (data.authenticated) {
        setCurrentUserTextId(data.staff.employee_id || data.staff.id)
      }
    }).catch(() => {})
  }, [authed])

  // Incoming message notifications (sound + popup toast)
  const handleNewMessage = useCallback((toast: IncomingToast) => {
    setToasts(prev => [toast, ...prev].slice(0, 3))
    // Auto-dismiss after 5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 5000)
  }, [])

  useIncomingMessageNotifications({
    currentUserId: currentUserTextId,
    soundEnabled: true,
    onNewMessage: handleNewMessage,
  })

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleToastClick = useCallback((conversationId: string) => {
    router.push(`/staff/messages?conv=${conversationId}`)
  }, [router])

  const handleLogout = async () => {
    // Clear local state before redirect
    localStorage.removeItem('boma_waiter_name');
    localStorage.removeItem('boma_waiter_cart');
    sessionStorage.clear();
    // Full page redirect to logout endpoint to ensure HttpOnly cookies are cleared
    window.location.href = '/api/admin/auth?action=logout';
  }

  const isLoginPage = pathname === '/staff/login'
  const isInstallPage = pathname === '/staff/install'

  if (checking) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pos-bg)', color: 'var(--pos-text-muted)', fontFamily: 'var(--pos-font)' }}>
        Loading...
      </div>
    )
  }

  if (!authed && !isLoginPage) {
    if (typeof window !== 'undefined') router.push('/staff/login')
    return null
  }

  const nav = role ? NAV_ITEMS[role] || [] : []
  const showNav = authed && !isLoginPage && !isInstallPage
  const rc = role ? ROLE_COLORS[role] : ROLE_COLORS.waiter

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--pos-bg)', color: 'var(--pos-text)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--pos-font)', overflow: 'hidden', maxHeight: '100dvh' }}>
      <FcmRegistration />
      <MessageToastContainer toasts={toasts} onDismiss={dismissToast} onClick={handleToastClick} />

      {/* Top bar */}
      {authed && !isLoginPage && !isInstallPage && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem', background: 'var(--pos-surface)', borderBottom: '1px solid var(--pos-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--pos-amber)', letterSpacing: '-0.02em' }}>Boma</span>
            <span style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--pos-radius-sm)', background: rc.bg, color: rc.text, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {role}
            </span>
          </div>
          <button onClick={handleLogout}
            style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--pos-radius-sm)', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--pos-font)' }}>
            Sign Out
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>

      {/* Bottom nav */}
      {showNav && (
        <div style={{ display: 'flex', background: 'var(--pos-surface)', borderTop: '1px solid var(--pos-border)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {nav.map(item => {
            const active = pathname === item.href || (item.href === '/admin/kitchen' && pathname === '/staff/kitchen') || (item.href === '/admin/bar' && pathname === '/staff/bar')
            const showBadge = item.href === '/staff/messages' && unreadCount > 0
            return (
              <button key={item.label} onClick={() => router.push(item.href)}
                style={{ flex: 1, padding: '0.5rem 0.25rem', border: 'none', background: 'transparent', color: active ? 'var(--pos-amber)' : 'var(--pos-text-dim)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: active ? 700 : 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', transition: 'color 0.15s', minHeight: '56px', justifyContent: 'center', fontFamily: 'var(--pos-font)', position: 'relative' }}>
                <span style={{ fontSize: '1.2rem', position: 'relative' }}>
                  {item.icon}
                  {showBadge && (
                    <span style={{
                      position: 'absolute', top: -4, right: -8,
                      padding: '0 4px', borderRadius: 9999,
                      background: '#ef4444', color: '#fff',
                      fontSize: 9, fontWeight: 700, minWidth: 14, height: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
