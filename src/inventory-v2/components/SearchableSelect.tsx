'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

export interface SearchableOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  disabled?: boolean
  error?: string
  /** When set, an extra pinned row is rendered that calls onChange with this value. */
  allowCreate?: boolean
  createLabel?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  required,
  disabled,
  error,
  allowCreate,
  createLabel = 'Create new',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const uniqueOptions = useMemo(() => {
    const seen = new Set<string>()
    return options.filter(option => {
      if (seen.has(option.value)) return false
      seen.add(option.value)
      return true
    })
  }, [options])

  const filtered = useMemo(() => {
    if (!search) return uniqueOptions
    const q = search.toLowerCase()
    return uniqueOptions.filter(opt => opt.label.toLowerCase().includes(q))
  }, [uniqueOptions, search])

  const selectedLabel = uniqueOptions.find(o => o.value === value)?.label ?? ''

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    setHighlightIndex(-1)
  }, [search])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter': {
        e.preventDefault()
        const highlighted = highlightIndex >= 0 ? filtered[highlightIndex] : undefined
        if (highlighted) {
          onChange(highlighted.value)
          setOpen(false)
          setSearch('')
          setHighlightIndex(-1)
        }
        break
      }
      case 'Escape':
        setOpen(false)
        setSearch('')
        setHighlightIndex(-1)
        break
    }
  }

  function selectOption(val: string) {
    onChange(val)
    setOpen(false)
    setSearch('')
    setHighlightIndex(-1)
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 12,
            color: '#94A3B8',
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          {label} {required && <span style={{ color: '#E85454' }}>*</span>}
        </label>
      )}
      <div
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 8,
          border: error ? '1px solid #E85454' : open ? '1px solid #FBBF24' : '1px solid #334155',
          background: '#111827',
          color: selectedLabel ? '#F8FAFC' : '#94A3B8',
          fontSize: 13,
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color 0.15s ease',
          minHeight: 38,
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: 13,
              fontFamily: 'Inter, system-ui, sans-serif',
              padding: 0,
            }}
          />
        ) : (
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel || placeholder}
          </span>
        )}

        {selectedLabel && !open && (
          <button
            onClick={clearSelection}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}

        <ChevronDown
          size={16}
          style={{
            color: '#94A3B8',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
          }}
        />
      </div>

      {error && (
        <span style={{ fontSize: 11, color: '#E85454', marginTop: 2, display: 'block' }}>
          {error}
        </span>
      )}

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            padding: 4,
            borderRadius: 8,
            border: '1px solid #334155',
            background: '#1B2336',
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 50,
            listStyle: 'none',
            margin: 0,
          }}
        >
          {filtered.length === 0 && !allowCreate ? (
            <li
              style={{
                padding: '8px 10px',
                fontSize: 12,
                color: '#94A3B8',
                textAlign: 'center',
              }}
            >
              No options found
            </li>
          ) : (
            <>
              {filtered.map((opt, idx) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => selectOption(opt.value)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#F8FAFC',
                    cursor: 'pointer',
                    background: idx === highlightIndex
                      ? 'rgba(251,191,36,0.12)'
                      : opt.value === value
                        ? 'rgba(251,191,36,0.06)'
                        : 'transparent',
                    transition: 'background 0.1s ease',
                  }}
                >
                  {opt.label}
                </li>
              ))}
              {allowCreate && (
                <li
                  onClick={() => selectOption('__create__')}
                  style={{
                    padding: '8px 10px',
                    marginTop: 4,
                    borderTop: '1px dashed #334155',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#FBBF24',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  + {createLabel}
                </li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  )
}
