'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const menuItems = [
  { label: 'Dashboard', icon: '📊', href: '/admin/dashboard' },
  { label: 'Content Map', icon: '🗺️', href: '/admin/content-map' },
  { label: 'Site Settings', icon: '⚙️', href: '/admin/site-settings' },
  { label: 'Menu', icon: '🍽️', href: '/admin/menu' },
  { label: 'Bar Menu', icon: '🍹', href: '/admin/bar-menu' },
  { label: 'Categories', icon: '🗂️', href: '/admin/categories' },
  { label: 'Events', icon: '🎉', href: '/admin/events' },
  { label: 'Promotions', icon: '🎁', href: '/admin/promotions' },
  { label: 'Gallery', icon: '🖼️', href: '/admin/gallery' },
  { label: 'Popup', icon: '🔔', href: '/admin/popup' },
  { label: 'Announcement', icon: '📢', href: '/admin/announcement' },
  { label: 'Inquiries', icon: '✉️', href: '/admin/inquiries' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const pathname = window?.location?.pathname || '';
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      return;
    }
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Show loading on any page while checking auth (but not for login page)
  if (isLoading && currentPath !== '/admin/login') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Allow login page to render without auth
  if (currentPath === '/admin/login') {
    return <>{children}</>;
  }
  
  if (!isAuthenticated) {
    return null;
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8f5f2' }}>
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: '280px',
        background: 'linear-gradient(180deg, var(--dark-brown) 0%, #1a0f0a 100%)',
        padding: '1.5rem',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 100,
        transition: 'transform 0.3s ease',
      }}>
        <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', textDecoration: 'none' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--white)' }}>The Boma</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--warm)' }}>Cafe</span>
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Admin Dashboard</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {menuItems.filter((item): item is { label: string; icon: string; href: string } => !!(item && item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                textDecoration: 'none',
                color: currentPath === item.href ? 'var(--white)' : 'rgba(255,255,255,0.7)',
                background: currentPath === item.href ? 'rgba(244,164,96,0.25)' : 'transparent',
                borderLeft: currentPath === item.href ? '3px solid var(--warm)' : '3px solid transparent',
                fontSize: '0.95rem',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
              onClick={closeSidebar}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', textDecoration: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem' }}>
            <span>🌐</span>
            View Website
          </Link>
          <button
            onClick={() => { closeSidebar(); logout(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', textDecoration: 'none', color: '#f87171', fontSize: '0.95rem', background: 'none', width: '100%', cursor: 'pointer', border: 'none', textAlign: 'left' }}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={closeSidebar}
        />
      )}

      {/* Mobile Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 101,
          padding: '0.75rem',
          background: 'var(--dark-brown)',
          border: 'none',
          borderRadius: '8px',
          color: 'var(--white)',
          cursor: 'pointer',
          display: 'none'
        }}
      >
        ☰
      </button>

      {/* Main Content */}
      <main className="admin-main" style={{ flex: 1, marginLeft: '280px', padding: '2rem' }}>
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          aside.admin-sidebar {
            transform: translateX(-100%) !important;
            width: 260px !important;
          }
          aside.admin-sidebar.open {
            transform: translateX(0) !important;
          }
          button[onclick*="setSidebarOpen"] {
            display: block !important;
          }
          main.admin-main {
            margin-left: 0 !important;
            width: 100% !important;
            overflow-x: hidden !important;
          }
        }
      `}</style>
    </div>
  );
}
