'use client'

import { useState, useEffect } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/inv', label: 'Dashboard', icon: '📊' },
  { href: '/inv/stock', label: 'Stock', icon: '📦' },
  { href: '/inv/products', label: 'Products', icon: '🏷️' },
  { href: '/inv/purchases', label: 'Receive Stock', icon: '🥤' },
  { href: '/inv/suppliers', label: 'Suppliers', icon: '🏬' },
  { href: '/inv/stock-counts', label: 'Stock Counts', icon: '📋' },
  { href: '/inv/adjustments', label: 'Adjustments', icon: '✏️' },
  { href: '/inv/waste', label: 'Waste', icon: '🗑️' },
  { href: '/inv/reports', label: 'Reports', icon: '📈' },
  { href: '/inv/activity', label: 'Activity', icon: '🕒' },
  { href: '/inv/users', label: 'Users & Roles', icon: '👥' },
]

function iconStyle(icon: string): CSSProperties {
  return { fontSize: 14, width: 18, textAlign: 'center' }
}

export default function InventoryPortalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  return (
    <div style={{ minHeight: '100vh', background: '#0F1220', color: '#E8E6F0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px',
        background: '#101A26', borderBottom: '1px solid #1E2A3A',
      }}>
        <Link href="/inv" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, background: '#C4A04E',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#101A26', fontWeight: 800, fontSize: 15,
          }}>B</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F0EDE8', letterSpacing: '0.02em' }}>
            Boma Café <span style={{ color: '#C4A04E', fontWeight: 400 }}>◈ Inventory</span>
          </span>
        </Link>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setOpen(!open)}
          aria-label="Open inventory menu"
          className="inv-mobile-hamburger"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 8, border: '1px solid #2A3648',
            background: '#141E2B', color: '#EDE8F0', cursor: 'pointer', fontSize: 17,
          }}
        >
          ☰
        </button>

        <Link href="/admin/operations" style={{
          fontSize: 13, color: '#90A0B8', textDecoration: 'none', padding: '8px 12px',
          borderRadius: 8, border: '1px solid #2A3648', whiteSpace: 'nowrap',
        }}>
          ← Main Admin
        </Link>
      </div>

      {/* Desktop nav rail */}
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 'calc(100vh - 56px)' }}>
        <aside className="inv-rail" style={{
          width: 208, flexShrink: 0, background: '#101A26', borderRight: '1px solid #232A3A',
          padding: '16px 10px', position: 'sticky', top: 56, alignSelf: 'flex-start',
          maxHeight: 'calc(100vh - 56px)', overflowY: 'auto',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#5A6A82', textTransform: 'uppercase', margin: '0 8px 8px' }}>
            Stock Operations
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => {
              const active = pathname === item.href || (item.href !== '/inv' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, fontSize: 13.5,
                    textDecoration: 'none', fontWeight: active ? 700 : 500,
                    color: active ? '#F0EDE8' : '#93A4BC',
                    background: active ? 'rgba(196,160,78,0.16)' : 'transparent',
                    borderLeft: `3px solid ${active ? '#C4A04E' : 'transparent'}`,
                  }}
                >
                  <span style={iconStyle(item.icon)}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: '#5A6B82', textTransform: 'uppercase', margin: '18px 12px 8px' }}>
            Quick Links
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Link href="/admin/operations/checklist" style={quickStyle}>Morning Checklist</Link>
            <Link href="/admin/operations/transactions" style={quickStyle}>All Transactions</Link>
            <Link href="/admin/operations/reports" style={quickStyle}>Full Reports</Link>
          </nav>
        </aside>

        {/* Mobile nav drawer */}
        {open && (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 70,
              display: 'flex', justifyContent: 'flex-end',
            }}
            onClick={() => setOpen(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: 260, height: '100%', background: '#101A26', padding: '16px 12px', overflowY: 'auto',
              }}
            >
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {NAV.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8, fontSize: 14,
                      textDecoration: 'none', color: pathname.startsWith(item.href) ? '#F0EDE8' : '#93A4BC',
                      background: pathname.startsWith(item.href) ? 'rgba(196,160,78,0.16)' : 'transparent',
                    }}
                  >
                    <span style={iconStyle(item.icon)}>{item.icon}</span>{item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main style={{ flex: 1, minWidth: 0, padding: '24px 28px 48px' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 860px) {
          aside.inv-rail { display: none; }
        }
        @media (min-width: 861px) {
          .inv-mobile-hamburger { display: none; }
        }
      `}</style>
    </div>
  )
}

const quickStyle: CSSProperties = {
  padding: '8px 12px', borderRadius: 8, fontSize: 13,
  textDecoration: 'none', color: '#8A9CB4',
}