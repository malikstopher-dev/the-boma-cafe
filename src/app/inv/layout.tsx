'use client'

import { useState, useEffect } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_GROUPS: Array<{ label: string; items: Array<{ href: string; label: string }> }> = [
  {
    label: 'Overview',
    items: [{ href: '/inv', label: 'Owner Dashboard' }],
  },
  {
    label: 'Stock',
    items: [
      { href: '/inv/stock', label: 'Stock Sheets' },
      { href: '/inv/locations', label: 'Stock by Location' },
      { href: '/inv/stock-counts', label: 'Stock Counts' },
      { href: '/inv/adjustments', label: 'Adjustments' },
      { href: '/inv/waste', label: 'Waste' },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { href: '/inv/purchases', label: 'Receive Stock' },
      { href: '/inv/payables', label: 'Supplier Payables' },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { href: '/inv/products', label: 'Products' },
      { href: '/inv/suppliers', label: 'Suppliers' },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/inv/reports', label: 'Reports' },
      { href: '/inv/activity', label: 'Activity / Audit' },
    ],
  },
  {
    label: 'System',
    items: [{ href: '/inv/users', label: 'Users & Roles' }],
  },
]

export default function InventoryPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  const isActive = (href: string) => (href === '/inv' ? pathname === '/inv' : pathname.startsWith(href))

  const linkStyle = (active: boolean): CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 8, fontSize: 13.5,
    textDecoration: 'none', fontWeight: active ? 700 : 500,
    color: active ? '#F0EBE3' : '#9A9080',
    background: active ? 'rgba(200,160,78,0.14)' : 'transparent',
    transition: 'background 0.12s ease, color 0.12s ease',
  })

  const groupStyle: CSSProperties = {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
    color: '#6B6049', margin: '16px 12px 6px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#14100B', color: '#F0EBE3', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 58, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px',
        background: 'rgba(20,16,11,0.9)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #3A322A',
      }}>
        <Link href="/inv" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
          <span style={{
            width: 32, height: 32, borderRadius: 9, background: '#C8A04E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#171208', fontWeight: 800, fontSize: 16,
          }}>B</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F0EBE3', letterSpacing: '0.01em' }}>
            The Boma Café <span style={{ color: '#C8A04E', fontWeight: 500 }}>Inventory &amp; Purchasing</span>
          </span>
        </Link>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setOpen(!open)}
          aria-label="Open inventory menu"
          className="inv-hamburger"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 9, border: '1px solid #3A322A',
            background: '#1C1710', color: '#F0EBE3', cursor: 'pointer', fontSize: 17,
          }}
        >
          ☰
        </button>

        <Link href="/admin/operations" style={{
          fontSize: 12, color: '#B8B0A0', textDecoration: 'none', padding: '8px 14px',
          borderRadius: 9, border: '1px solid #3A322A', whiteSpace: 'nowrap',
          transition: 'border-color 0.15s ease',
        }}>
          ← Main Admin
        </Link>
      </header>

      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - 58px)' }}>
        {/* Desktop nav rail */}
        <aside className="inv-rail" style={{
          width: 222, flexShrink: 0, background: '#1C1710', borderRight: '1px solid #332B21',
          padding: '14px 10px 24px', position: 'sticky', top: 58, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 58px)', overflowY: 'auto',
        }}>
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p style={groupStyle}>{group.label}</p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(item => (
                  <Link key={item.href} href={item.href} style={linkStyle(isActive(item.href))}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
          <p style={groupStyle}>Quick Links</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Link href="/admin/operations/checklist" style={linkStyle(false)}>Morning Checklist</Link>
            <Link href="/admin/operations/purchase-orders" style={linkStyle(false)}>Purchase Orders</Link>
            <Link href="/admin/operations/report" style={linkStyle(false)}>Operations Reports</Link>
          </nav>
        </aside>

        {/* Mobile nav drawer */}
        {open && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70, display: 'flex', justifyContent: 'flex-end' }}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ width: 280, height: '100%', background: '#1C1710', padding: '18px 14px', overflowY: 'auto' }}
            >
              {NAV_GROUPS.map(group => (
                <div key={group.label}>
                  <p style={groupStyle}>{group.label}</p>
                  <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {group.items.map(item => (
                      <Link key={item.href} href={item.href} style={linkStyle(isActive(item.href))}>
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: '26px 30px 56px', maxWidth: 1480, margin: '0 auto', width: '100%' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 900px) {
          aside.inv-rail { display: none; }
        }
        @media (min-width: 901px) {
          .inv-hamburger { display: none; }
        }
        body { background: #14100B; }
      `}</style>
    </div>
  )
}