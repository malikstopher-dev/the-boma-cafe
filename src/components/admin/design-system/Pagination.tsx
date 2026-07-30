'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import styles from './DesignSystem.module.css'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalItems)

  function getVisiblePages(): (number | 'ellipsis')[] {
    const pages: (number | 'ellipsis')[] = []
    const delta = 1

    const rangeStart = Math.max(2, currentPage - delta)
    const rangeEnd = Math.min(totalPages - 1, currentPage + delta)

    pages.push(1)
    if (rangeStart > 2) pages.push('ellipsis')
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i)
    if (rangeEnd < totalPages - 1) pages.push('ellipsis')
    if (totalPages > 1) pages.push(totalPages)

    return pages
  }

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        {startItem}–{endItem} of {totalItems}
      </span>
      <div className={styles.paginationControls}>
        <button
          className={styles.paginationButton}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className={styles.paginationButton}
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>
        {getVisiblePages().map((page, i) =>
          page === 'ellipsis' ? (
            <span key={`e-${i}`} className={styles.paginationEllipsis}>…</span>
          ) : (
            <button
              key={page}
              className={`${styles.paginationButton} ${page === currentPage ? styles.paginationButtonActive : ''}`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          )
        )}
        <button
          className={styles.paginationButton}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className={styles.paginationButton}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}
