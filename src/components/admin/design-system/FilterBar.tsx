'use client'

import { Search, X } from 'lucide-react'
import styles from './DesignSystem.module.css'

interface FilterBarProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  children?: React.ReactNode
}

export default function FilterBar({ searchValue, onSearchChange, searchPlaceholder = 'Search…', children }: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      {onSearchChange && (
        <div className={styles.filterBarSearch}>
          <Search size={16} className={styles.filterBarSearchIcon} />
          <input
            type="text"
            className={styles.filterBarSearchInput}
            placeholder={searchPlaceholder}
            value={searchValue ?? ''}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchValue && (
            <button className={styles.filterBarSearchClear} onClick={() => onSearchChange('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      )}
      {children && <div className={styles.filterBarControls}>{children}</div>}
    </div>
  )
}
