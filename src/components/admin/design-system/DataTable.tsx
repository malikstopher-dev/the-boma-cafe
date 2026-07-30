'use client'

import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import styles from './DesignSystem.module.css'

export interface Column<T> {
  key: string
  header: string
  cell: (item: T) => React.ReactNode
  sortable?: boolean
  sortKey?: string
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T | ((item: T) => string)
  onRowClick?: (item: T) => void
  emptyState?: React.ReactNode
  isLoading?: boolean
  className?: string
  initialSortKey?: string
  initialSortDirection?: 'asc' | 'desc'
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyState,
  isLoading,
  className = '',
  initialSortKey,
  initialSortDirection = 'asc',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDirection)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find(c => c.sortKey === sortKey || c.key === sortKey)
    if (!col || !col.sortable) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const cmp = typeof aVal === 'string'
        ? aVal.localeCompare(String(bVal))
        : aVal < bVal ? -1 : aVal > bVal ? 1 : 0

      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir, columns])

  function toggleSort(col: Column<T>) {
    const key = col.sortKey ?? col.key
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function getRowKey(item: T): string {
    if (typeof keyField === 'function') return keyField(item)
    return String(item[keyField])
  }

  if (isLoading) {
    return (
      <div className={styles.dataTable}>
        <div className={`${styles.dataTableWrapper} ${className}`}>
          <table className={styles.dataTableElement}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key} className={`${styles.dataTableHeader} ${col.headerClassName ?? ''}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
          <div className={styles.dataTableLoading}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.dataTableSkeletonRow}>
                {columns.map(col => (
                  <div key={col.key} className={styles.dataTableSkeletonCell}>
                    <div className={styles.skeleton} style={{ height: 14, width: `${60 + Math.random() * 30}%` }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className={styles.dataTable}>
        {emptyState ?? (
          <div className={styles.dataTableEmpty}>
            <p className={styles.dataTableEmptyText}>No data</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.dataTable}>
      <div className={`${styles.dataTableWrapper} ${className}`}>
        <table className={styles.dataTableElement}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${styles.dataTableHeader} ${col.sortable ? styles.dataTableHeaderSortable : ''} ${col.headerClassName ?? ''}`}
                  onClick={() => col.sortable && toggleSort(col)}
                  aria-sort={
                    col.sortable && sortKey === (col.sortKey ?? col.key)
                      ? sortDir === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <span className={styles.dataTableHeaderContent}>
                    {col.header}
                    {col.sortable && (
                      <span className={styles.dataTableSortIcon}>
                        {sortKey === (col.sortKey ?? col.key) ? (
                          sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : (
                          <ChevronsUpDown size={14} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr
                key={getRowKey(item)}
                className={`${styles.dataTableRow} ${onRowClick ? styles.dataTableRowClickable : ''}`}
                onClick={() => onRowClick?.(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item) } } : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className={`${styles.dataTableCell} ${col.className ?? ''}`}>
                    {col.cell(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
