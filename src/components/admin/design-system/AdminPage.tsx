'use client'

import { PageHeader, Breadcrumbs, BackButton } from './PageHeader'
import styles from './DesignSystem.module.css'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AdminPageProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  backHref?: string
  backLabel?: string
  filters?: React.ReactNode
  children: React.ReactNode
  pagination?: React.ReactNode
}

export default function AdminPage({
  title,
  description,
  actions,
  breadcrumbs,
  backHref,
  backLabel,
  filters,
  children,
  pagination,
}: AdminPageProps) {
  return (
    <div className={styles.adminPage}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      {backHref && <BackButton href={backHref} label={backLabel} />}
      <PageHeader title={title} description={description} actions={actions} />
      {filters && <div className={styles.adminPageFilters}>{filters}</div>}
      <div className={styles.adminPageContent}>{children}</div>
      {pagination && <div className={styles.adminPagePagination}>{pagination}</div>}
    </div>
  )
}
