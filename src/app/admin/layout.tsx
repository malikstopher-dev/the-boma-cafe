'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import dynamic from 'next/dynamic';
import Sidebar, { BottomNav } from '@/components/admin/Sidebar';
import { ToastProvider } from '@/components/admin/design-system';

const ConnectionStatus = dynamic(() => import('@/components/ui/ConnectionStatus'), { ssr: false });

// Pages that get full-width layout (no sidebar)
const FULL_WIDTH_PAGES = ['/admin/orders', '/admin/kitchen', '/admin/bar'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        background: '#F8F9FB',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '3px solid #E5E7EB',
            borderTopColor: '#0F766E',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading...</p>
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
      <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FB', fontFamily: "'Inter', -apple-system, sans-serif" }}>
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
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 18,
            color: '#0F172A',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          className="admin-hamburger"
        >
          ☰
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
