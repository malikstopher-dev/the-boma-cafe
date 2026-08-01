'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/admin/design-system/Button'
import Badge from '@/components/admin/design-system/Badge'
import styles from '@/components/admin/design-system/DesignSystem.module.css'

type ChecklistItem = {
  id: string
  title: string
  description: string | null
  category: string
  sort_order: number
  is_required: boolean
  status: 'pending' | 'completed' | 'skipped' | 'failed'
  notes: string | null
}

type ChecklistData = {
  id: string
  location_id: string
  checklist_date: string
  status: 'in_progress' | 'completed' | 'skipped'
  opened_at: string
  completed_at: string | null
  manager_notes: string | null
  items: ChecklistItem[]
}

type ReconciliationRow = {
  product_name: string
  product_type: string
  expected_qty: number
  physical_qty: number | null
  variance: number
  variance_value: number
}

type DashboardKpi = {
  label: string
  value: string | number
}

const categoryLabels: Record<string, string> = {
  refrigeration: 'Refrigeration',
  stock: 'Stock Levels',
  reconciliation: 'Reconciliation',
  cleanliness: 'Cleanliness',
  admin: 'Administration',
  equipment: 'Equipment',
  menu: 'Menu & Specials',
  general: 'General',
}

const categoryOrder = ['refrigeration', 'stock', 'reconciliation', 'equipment', 'cleanliness', 'menu', 'admin', 'general']

const categoryIcons: Record<string, string> = {
  refrigeration: '🌡️',
  stock: '📦',
  reconciliation: '📊',
  equipment: '🔧',
  cleanliness: '🧹',
  menu: '🍽️',
  admin: '📋',
  general: '📌',
}

const categoryImages: Record<string, string> = {
  refrigeration: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&h=300&fit=crop',
  stock: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&h=300&fit=crop',
  reconciliation: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=300&fit=crop',
  equipment: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=300&fit=crop',
  cleanliness: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&h=300&fit=crop',
  menu: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
  admin: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=300&fit=crop',
  general: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=300&fit=crop',
}

const weeklyData = [45, 72, 58, 85, 64, 92, 78]
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function OpeningChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [managerNotes, setManagerNotes] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [reconciliationTab, setReconciliationTab] = useState<'summary' | 'detail'>('summary')
  const [reconciliationData, setReconciliationData] = useState<ReconciliationRow[]>([])
  const [kpiData, setKpiData] = useState<DashboardKpi[]>([])

  useEffect(() => {
    fetchChecklist()
    fetchReconciliationData()
    fetchKpiData()
  }, [])

  async function fetchChecklist() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/inventory/checklist?location_id=main')
      const json = await res.json()
      setChecklist(json.data)
      setManagerNotes(json.data?.manager_notes ?? '')
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }

  async function fetchReconciliationData() {
    try {
      const res = await fetch('/api/inventory/dashboard?section=reconciliation&location_id=main')
      const json = await res.json()
      if (json.data?.reconciliation) setReconciliationData(json.data.reconciliation)
    } catch { /* ignore */ }
  }

  async function fetchKpiData() {
    try {
      const res = await fetch('/api/inventory/dashboard?section=combined&location_id=main')
      const json = await res.json()
      const d = json.data
      if (d) {
        setKpiData([
          { label: 'Products', value: d.total_products ?? 0 },
          { label: 'Inventory Value', value: `R${(d.inventory_value ?? 0).toLocaleString()}` },
          { label: 'Low Stock', value: d.low_stock ?? 0 },
          { label: 'Out of Stock', value: d.out_of_stock ?? 0 },
        ])
      }
    } catch { /* ignore */ }
  }

  async function toggleItem(item: ChecklistItem) {
    const newStatus = item.status === 'completed' ? 'pending' : 'completed'
    setSaving(item.id)
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await fetchChecklist()
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }

  async function completeChecklist() {
    setSaving('complete')
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', manager_notes: managerNotes || null }),
      })
      await fetchChecklist()
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }

  async function saveNotes() {
    setSaving('notes')
    try {
      await fetch(`/api/inventory/checklist/${checklist!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_notes: managerNotes }),
      })
    } catch { /* ignore */ }
    finally { setSaving(null) }
  }

  function groupedItems(): Record<string, ChecklistItem[]> {
    if (!checklist) return {}
    const groups: Record<string, ChecklistItem[]> = {}
    for (const item of checklist.items) {
      const cat = item.category || 'general'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }
    return groups
  }

  const completedCount = checklist?.items.filter(i => i.status === 'completed').length ?? 0
  const totalCount = checklist?.items.length ?? 0
  const isComplete = checklist?.status === 'completed'
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const maxBar = Math.max(...weeklyData, 1)

  const grouped = groupedItems()
  const visibleCategories = categoryOrder.filter(c => grouped[c]?.length)
  const leftCategories = visibleCategories.slice(0, Math.ceil(visibleCategories.length / 2))
  const rightCategories = visibleCategories.slice(Math.ceil(visibleCategories.length / 2))

  if (isLoading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#A09888', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
        Loading checklist...
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Full-Width Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            fontWeight: 700,
            color: '#F0EBE3',
            lineHeight: 1.2,
            margin: 0,
          }}>
            Morning Opening Checklist{' '}
            {checklist && (
              <span style={{ color: '#A09888', fontWeight: 400 }}>
                &bull; {new Date(checklist.checklist_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {!isComplete ? (
              <button
                onClick={completeChecklist}
                disabled={saving === 'complete'}
                style={{
                  background: '#C8A04E',
                  color: '#1A1610',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  cursor: saving === 'complete' ? 'not-allowed' : 'pointer',
                  opacity: saving === 'complete' ? 0.6 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {saving === 'complete' ? 'Completing...' : 'Complete Checklist'}
              </button>
            ) : (
              <div style={{
                background: 'rgba(76,175,80,0.12)',
                color: '#4CAF50',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}>
                ✓ Completed
                {checklist?.completed_at && (
                  <span style={{ marginLeft: 8, fontWeight: 400, color: '#6B6358', fontSize: 12 }}>
                    at {new Date(checklist.completed_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}
            <Link href="/admin/operations/history" style={{ fontSize: 13, color: '#C8A04E', textDecoration: 'none', fontWeight: 500 }}>
              History
            </Link>
          </div>
        </div>
        <p style={{ color: '#A09888', fontSize: 14, margin: '0 0 12px 0', fontFamily: 'Inter, sans-serif' }}>
          <span style={{ fontWeight: 600, color: '#F0EBE3' }}>{completedCount}</span> of{' '}
          <span style={{ fontWeight: 600, color: '#F0EBE3' }}>{totalCount}</span> items completed
        </p>
        <div className={styles.progressTrack} style={{ height: 6 }}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* ── Two-Panel Layout ── */}
      <div className={styles.landingGrid}>
        {/* ── Left Panel: Checklist Categories ── */}
        <div>
          <div className={styles.categoryGrid}>
            {/* First column of categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {leftCategories.map(category => (
                <CategoryCard
                  key={category}
                  category={category}
                  items={grouped[category]}
                  isComplete={isComplete}
                  saving={saving}
                  onToggle={toggleItem}
                />
              ))}
            </div>
            {/* Second column of categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rightCategories.map(category => (
                <CategoryCard
                  key={category}
                  category={category}
                  items={grouped[category]}
                  isComplete={isComplete}
                  saving={saving}
                  onToggle={toggleItem}
                />
              ))}
            </div>
          </div>

          {/* Manager Notes */}
          <div style={{
            marginTop: 24,
            borderTop: '1px solid #3A3428',
            paddingTop: 20,
          }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 600,
              color: '#A09888',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontFamily: 'Inter, sans-serif',
            }}>
              Manager Notes
            </label>
            <textarea
              value={managerNotes}
              onChange={e => setManagerNotes(e.target.value)}
              placeholder="Add any notes about today's opening..."
              rows={3}
              className={`${styles.input} ${styles.textarea}`}
            />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={saveNotes} disabled={saving === 'notes'} variant="secondary" size="sm">
                {saving === 'notes' ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Right Panel: Management Dashboard ── */}
        <div className={styles.dashboardPanel}>
          <div className={styles.dashboardPanelTitle}>Management Dashboard</div>

          {/* KPI Row */}
          <div className={styles.kpiCompactGrid}>
            {kpiData.length > 0 ? kpiData.map((kpi, i) => (
              <div key={i} className={styles.kpiCompactCard}>
                <div className={styles.kpiCompactValue}>{kpi.value}</div>
                <div className={styles.kpiCompactLabel}>{kpi.label}</div>
              </div>
            )) : (
              <>
                <div className={styles.kpiCompactCard}>
                  <div className={styles.kpiCompactValue}>{totalCount}</div>
                  <div className={styles.kpiCompactLabel}>Checklist Items</div>
                </div>
                <div className={styles.kpiCompactCard}>
                  <div className={styles.kpiCompactValue}>{completedCount}</div>
                  <div className={styles.kpiCompactLabel}>Completed</div>
                </div>
                <div className={styles.kpiCompactCard}>
                  <div className={styles.kpiCompactValue}>{reconciliationData.length}</div>
                  <div className={styles.kpiCompactLabel}>Products</div>
                </div>
                <div className={styles.kpiCompactCard}>
                  <div className={styles.kpiCompactValue}>R0</div>
                  <div className={styles.kpiCompactLabel}>Variance</div>
                </div>
              </>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16 }}>
            <button
              onClick={() => setReconciliationTab('summary')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: reconciliationTab === 'summary' ? '#2A261E' : 'transparent',
                border: '1px solid #3A3428',
                borderBottom: reconciliationTab === 'summary' ? 'none' : '1px solid #3A3428',
                borderRadius: '8px 8px 0 0',
                color: reconciliationTab === 'summary' ? '#C8A04E' : '#A09888',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s ease',
              }}
            >
              What happened?
            </button>
            <button
              onClick={() => setReconciliationTab('detail')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: reconciliationTab === 'detail' ? '#2A261E' : 'transparent',
                border: '1px solid #3A3428',
                borderBottom: reconciliationTab === 'detail' ? 'none' : '1px solid #3A3428',
                borderRadius: '8px 8px 0 0',
                color: reconciliationTab === 'detail' ? '#C8A04E' : '#A09888',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                transition: 'all 0.15s ease',
              }}
            >
              Reconciliation Detail
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ background: '#1A1610', border: '1px solid #3A3428', borderRadius: '0 0 8px 8px', padding: 16, marginBottom: 20 }}>
            {reconciliationTab === 'summary' ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                  {/* Donut Chart */}
                  <div className={styles.donutChart}>
                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3A3428" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#C8A04E" strokeWidth="3"
                        strokeDasharray={`${progressPct} ${100 - progressPct}`} strokeLinecap="round" />
                    </svg>
                    <div className={styles.donutChartLabel}>
                      <span>{completedCount}/{totalCount}</span>
                      <span className={styles.donutChartSubLabel}>Checked</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#A09888', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Products Checked</div>
                    <div style={{ fontSize: 12, color: '#6B6358', marginBottom: 12 }}>{completedCount} / {totalCount}</div>
                    <div style={{ fontSize: 12, color: '#A09888', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Total Variance</div>
                    <div style={{ fontSize: 12, color: '#6B6358', marginBottom: 12 }}>0.00</div>
                    <div style={{ fontSize: 12, color: '#A09888', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>Variance Value</div>
                    <div style={{ fontSize: 12, color: '#6B6358' }}>R 0.00</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search products..."
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #3A3428',
                      background: '#242018',
                      color: '#F0EBE3',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      outline: 'none',
                    }}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#A09888', fontFamily: 'Inter, sans-serif' }}>
                    <input type="checkbox" style={{ accentColor: '#C8A04E' }} />
                    Variances only
                  </label>
                </div>
                {reconciliationData.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
                    <thead>
                      <tr>
                        {['Product', 'Type', 'Expected', 'Actual', 'Variance'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#6B6358', borderBottom: '1px solid #3A3428', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationData.slice(0, 6).map((row, i) => (
                        <tr key={i}>
                          <td style={{ padding: '6px 8px', color: '#F0EBE3', borderBottom: '1px solid #3A3428' }}>{row.product_name}</td>
                          <td style={{ padding: '6px 8px', color: '#A09888', borderBottom: '1px solid #3A3428' }}>{row.product_type}</td>
                          <td style={{ padding: '6px 8px', color: '#A09888', borderBottom: '1px solid #3A3428' }}>{row.expected_qty}</td>
                          <td style={{ padding: '6px 8px', color: '#A09888', borderBottom: '1px solid #3A3428' }}>{row.physical_qty ?? '—'}</td>
                          <td style={{ padding: '6px 8px', color: row.variance !== 0 ? '#E85454' : '#A09888', borderBottom: '1px solid #3A3428' }}>{row.variance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: 12, color: '#6B6358', textAlign: 'center', padding: 16, fontFamily: 'Inter, sans-serif' }}>No variance data for today</p>
                )}
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#F0EBE3', marginBottom: 12, fontFamily: 'Inter, sans-serif' }}>Performance Summary</h3>
            <div style={{ background: '#1A1610', border: '1px solid #3A3428', borderRadius: 8, padding: 16 }}>
              <div className={styles.barChart}>
                {weeklyData.map((val, i) => (
                  <div key={i} className={styles.barChartBar} style={{ height: `${(val / maxBar) * 100}%` }} />
                ))}
              </div>
              <div className={styles.barChartAxis}>
                {dayLabels.map((day, i) => (
                  <div key={i} className={styles.barChartAxisLabel}>{day}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryCard({
  category,
  items,
  isComplete,
  saving,
  onToggle,
}: {
  category: string
  items: ChecklistItem[]
  isComplete: boolean
  saving: string | null
  onToggle: (item: ChecklistItem) => void
}) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order)
  const done = sorted.filter(i => i.status === 'completed').length
  const imgUrl = categoryImages[category]

  return (
    <div className={styles.categoryCard}>
      {/* Header with photo */}
      <div className={styles.categoryCardHeader}>
        {imgUrl && (
          <>
            <img src={imgUrl} alt="" className={styles.categoryCardHeaderImage} loading="lazy" />
            <div className={styles.categoryCardHeaderOverlay} />
          </>
        )}
        <div className={styles.categoryCardHeaderContent}>
          <span className={styles.categoryCardIcon}>{categoryIcons[category] ?? '📌'}</span>
          <span className={styles.categoryCardTitle}>{categoryLabels[category] ?? category}</span>
          <span className={styles.categoryCardCount}>{done}/{sorted.length}</span>
        </div>
      </div>

      {/* Items */}
      <div className={styles.categoryCardBody}>
        {sorted.map(item => (
          <div
            key={item.id}
            className={styles.checklistItem}
            onClick={() => onToggle(item)}
            style={{ opacity: saving === item.id ? 0.5 : 1 }}
          >
            <div className={`${styles.checklistItemCheck} ${item.status === 'completed' ? styles.checklistItemCheckCompleted : ''}`}>
              {item.status === 'completed' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#1A1610" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className={`${styles.checklistItemTitle} ${item.status === 'completed' ? styles.checklistItemTitleCompleted : ''}`}>
                  {item.title}
                </span>
                {item.is_required && !isComplete && (
                  <span className={styles.badgeRequired}>Required</span>
                )}
              </div>
              {item.description && (
                <p className={styles.checklistItemDescription}>{item.description}</p>
              )}
            </div>
            {item.status === 'skipped' && <Badge variant="warning">Skipped</Badge>}
            {item.status === 'failed' && <Badge variant="danger">Failed</Badge>}
          </div>
        ))}
      </div>
    </div>
  )
}
