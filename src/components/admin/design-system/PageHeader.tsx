'use client'

import Link from 'next/link'
import styles from './DesignSystem.module.css'

export function PageHeader({ title, description, actions }: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderRow}>
        <h1 className={styles.pageTitle}>{title}</h1>
        {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{actions}</div>}
      </div>
      {description && <p className={styles.pageDescription}>{description}</p>}
    </div>
  )
}

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {i > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
          {item.href ? (
            <Link href={item.href} className={styles.breadcrumbLink}>{item.label}</Link>
          ) : (
            <span className={styles.breadcrumbCurrent}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function BackButton({ href = '/admin/dashboard', label = 'Back' }: {
  href?: string
  label?: string
}) {
  return (
    <Link href={href} style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '13px',
      fontWeight: 500,
      color: '#A09888',
      textDecoration: 'none',
      marginBottom: '12px',
      transition: 'color 0.15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.color = '#C8A04E')}
    onMouseLeave={e => (e.currentTarget.style.color = '#A09888')}
    >
      ← {label}
    </Link>
  )
}
