'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import Sidebar, { BottomNav } from '@/components/admin/Sidebar';
import { ToastProvider } from '@/components/admin/design-system';
import { useIncomingMessageNotifications, MessageToastContainer, type IncomingToast } from '@/components/chat/MessageNotifications';

const ConnectionStatus = dynamic(() => import('@/components/ui/ConnectionStatus'), { ssr: false });

// Pages that get full-width layout (no sidebar)
const FULL_WIDTH_PAGES = ['/admin/orders', '/admin/kitchen', '/admin/bar'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, roleLabel, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<IncomingToast[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const changePassword = async () => {
    setPwMessage(null);
    if (!pwCurrent || !pwNew) {
      setPwMessage({ ok: false, text: 'Current and new password are required.' });
      return;
    }
    if (pwNew.length < 6) {
      setPwMessage({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMessage({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwMessage({ ok: false, text: data.error || 'Failed to change password.' });
      } else {
        setPwMessage({ ok: true, text: data.message || 'Password changed.' });
        setPwCurrent('');
        setPwNew('');
        setPwConfirm('');
      }
    } catch {
      setPwMessage({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setPwBusy(false);
    }
  };

  const isIndividualAccount = !!user && !!user.id && user.id !== 'legacy';

  const pwInputStyle: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 8,
    background: '#1A1610',
    border: '1px solid #3A3428',
    color: '#F0EBE3',
    fontSize: 13.5,
    outline: 'none',
  };

  // Incoming message notifications (sound + popup toast)
  const handleNewMessage = useCallback((toast: IncomingToast) => {
    setToasts(prev => [toast, ...prev].slice(0, 3))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
    }, 5000)
  }, [])

  useIncomingMessageNotifications({
    currentUserId,
    soundEnabled: true,
    onNewMessage: handleNewMessage,
  })

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleToastClick = useCallback((conversationId: string) => {
    router.push(`/admin/messages?conv=${conversationId}`)
  }, [router])

  // Auth redirect
  useEffect(() => {
    if (pathname === '/admin/login' || pathname === '/admin/kitchen' || pathname === '/admin/bar') return;
    if (!isLoading && !isAuthenticated) {
      router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Login page: no sidebar, no auth
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Loading state (skip for full-width pages — they have their own auth UI)
  if (isLoading && !FULL_WIDTH_PAGES.includes(pathname)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1A1610',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #3A3428',
            borderTopColor: '#C8A04E',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#A09888', fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Not authenticated → render null (redirect handled by useEffect)
  // Bar/Kitchen pages have their own StationDisplay password gate — allow through
  if (!isAuthenticated && !FULL_WIDTH_PAGES.includes(pathname)) return null;

  // Full-width pages (Orders POS, Kitchen, Bar)
  if (FULL_WIDTH_PAGES.includes(pathname)) {
    return (
      <ToastProvider>
        <div style={{ minHeight: '100vh', background: '#0F1115', paddingTop: 60 }}>
          {children}
        <ConnectionStatus />
        <MessageToastContainer toasts={toasts} onDismiss={dismissToast} onClick={handleToastClick} />
          <MessageToastContainer toasts={toasts} onDismiss={dismissToast} onClick={handleToastClick} />

          {/* Floating nav overlay for full-width POS pages */}
          <div style={{
            position: 'fixed', top: 12, left: 12, right: 12, zIndex: 100,
            display: 'flex', gap: 8, justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => router.push('/admin/dashboard')}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
              >
                ← Dashboard
              </button>
              <button
                onClick={() => router.push('/staff/messages')}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(8px)',
                }}
              >
                💬 Messages
              </button>
            </div>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#1A1610', fontFamily: "'Inter', -apple-system, sans-serif" }}>
        {/* Acting manager banner — every change is attributed to this identity */}
        {isAuthenticated && user?.display_name && (
          <div style={{
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 102,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            rowGap: 6,
            maxWidth: 'min(92vw, 480px)',
            background: 'rgba(200,160,78,0.12)',
            border: '1px solid rgba(200,160,78,0.35)',
            borderRadius: 999,
            padding: '5px 14px',
            fontSize: 12.5,
            color: '#C8A04E',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontWeight: 600 }}>Logged in as</span>
            <span style={{ color: '#F0EBE3', fontWeight: 600 }}>{user.display_name}</span>
            <span style={{ opacity: 0.85 }}>· {roleLabel()}</span>
            {isIndividualAccount && (
              <button
                onClick={() => setPwModalOpen(true)}
                style={{
                  marginLeft: 8,
                  flexShrink: 0,
                  padding: '2px 10px',
                  borderRadius: 999,
                  background: 'rgba(200,160,78,0.15)',
                  border: '1px solid rgba(200,160,78,0.45)',
                  color: '#C8A04E',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Change Password
              </button>
            )}
          </div>
        )}

        {/* Change password modal */}
        {pwModalOpen && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} onClick={() => setPwModalOpen(false)}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 360, maxWidth: '92vw',
                background: '#242018', border: '1px solid #3A3428', borderRadius: 12,
                padding: 24, color: '#F0EBE3',
              }}
            >
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#C8A04E' }}>Change Password</h3>
              <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#A09888' }}>
                Signing out of your other devices after this change.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={pwCurrent}
                  onChange={e => setPwCurrent(e.target.value)}
                  style={pwInputStyle}
                />
                <input
                  type="password"
                  placeholder="New password (min 6 characters)"
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  style={pwInputStyle}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  style={pwInputStyle}
                />
                {pwMessage && (
                  <p style={{ margin: 0, fontSize: 12.5, color: pwMessage.ok ? '#7BC86E' : '#E05B5B' }}>
                    {pwMessage.text}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => setPwModalOpen(false)}
                    style={{ padding: '7px 14px', borderRadius: 8, background: 'transparent', border: '1px solid #3A3428', color: '#A09888', cursor: 'pointer', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={changePassword}
                    disabled={pwBusy}
                    style={{ padding: '7px 14px', borderRadius: 8, background: '#C8A04E', border: 'none', color: '#1A1610', fontWeight: 600, cursor: 'pointer', fontSize: 13, opacity: pwBusy ? 0.6 : 1 }}
                  >
                    {pwBusy ? 'Saving…' : 'Save Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        {/* Mobile hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 101,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#242018',
            border: '1px solid #3A3428',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            color: '#F0EBE3',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
          className="admin-hamburger"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Main content */}
        <main style={{
          flex: 1,
          marginLeft: 240,
          padding: '24px 32px',
          paddingBottom: 32,
          maxWidth: '100%',
          overflowX: 'hidden',
        }} className="admin-main">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <BottomNav onMoreClick={() => setSidebarOpen(true)} />

        <ConnectionStatus />

        <style>{`
          @media (max-width: 768px) {
            .admin-hamburger {
              display: flex !important;
            }
            .admin-main {
              margin-left: 0 !important;
              padding: 16px !important;
              padding-top: 56px !important;
              padding-bottom: 80px !important;
            }
          }
          @media (min-width: 769px) {
            .admin-hamburger {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </ToastProvider>
  );
}
