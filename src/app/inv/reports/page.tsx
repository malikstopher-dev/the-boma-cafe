'use client'

import Link from 'next/link'

const LINKS = [
  { href: '/admin/operations/reports', label: 'Full Reports Hub', desc: 'Daily stock report, waste, valuation, fast/slow movers, supplier reports.', icon: '📈' },
  { href: '/admin/operations/reorder', label: 'Reorder Suggestions', desc: 'Products below threshold — what to buy next.', icon: '🔄' },
  { href: '/admin/operations/forecast', label: 'Forecasting', desc: 'Depletion forecasts and consumption patterns.', icon: '🔮' },
  { href: '/admin/operations/analytics', label: 'Analytics', desc: 'Consumption trends, waste heatmap, inventory value trend.', icon: '📊' },
  { href: '/admin/operations/variance', label: 'Variance Report', desc: 'Expected vs counted per product after a stock count.', icon: '⚖️' },
  { href: '/admin/operations/supplier-performance', label: 'Supplier Performance', desc: 'On-time delivery and quality by supplier.', icon: '🏆' },
  { href: '/admin/operations/price-history', label: 'Price History', desc: 'Unit cost history from purchase transactions.', icon: '💰' },
  { href: '/admin/operations/purchase-orders', label: 'Purchase Orders', desc: 'Full PO list with statuses and receiving.', icon: '🧾' },
]

export default function ReportsPage() {
  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Reports</h1>
      <p style={{ color: '#90A0B8', fontSize: 13, margin: '0 0 22px' }}>
        The deep-dive report suites live in the main admin — everything here opens with the full filters.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#141E2B', border: '1px solid #232A3A', borderRadius: 12, padding: 18,
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 24 }}>{l.icon}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#C4A04E' }}>{l.label}</div>
                <div style={{ fontSize: 12.5, color: '#90A0B8', marginTop: 4, lineHeight: 1.45 }}>{l.desc}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}