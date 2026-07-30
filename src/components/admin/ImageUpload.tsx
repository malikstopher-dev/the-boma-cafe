'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useToast } from '@/components/admin/design-system/Toast'

type Module = 'food' | 'drinks' | 'categories' | 'promotions' | 'events' | 'gallery'

interface ImageUploadProps {
  module: Module
  value?: string
  onChange: (storagePath: string) => void
  label?: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export default function ImageUpload({ module, value, onChange, label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { success, error: showError } = useToast()

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Invalid file type', 'Only JPG, PNG, and WEBP are supported.')
      return
    }
    if (file.size > MAX_SIZE) {
      showError('File too large', 'Maximum file size is 5MB.')
      return
    }

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setStatus('Uploading...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('module', module)

      const res = await fetch('/api/admin/upload-menu-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      onChange(data.storagePath)
      setStatus('Upload complete')
      success('Image uploaded', 'Image has been saved successfully.')
    } catch (err) {
      setPreview(null)
      setStatus(null)
      showError('Upload failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploading(false)
    }
  }, [module, onChange, success, showError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }, [handleFile])

  const handleRemove = useCallback(() => {
    setPreview(null)
    setStatus(null)
    onChange('')
  }, [onChange])

  const resolvedSrc = useMemo(() => {
    if (preview) return preview
    if (!value) return null
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) return value
    return `/api/supa-image?path=${encodeURIComponent(value)}`
  }, [value, preview])

  return (
    <div>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {label}
        </div>
      )}

      {/* Preview */}
      {resolvedSrc && (
        <div style={{ marginBottom: 10, position: 'relative', display: 'inline-block' }}>
          <img
            src={resolvedSrc}
            alt="Preview"
            style={{
              width: 160,
              height: 120,
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#0F766E' : '#D1D5DB'}`,
          borderRadius: 8,
          padding: resolvedSrc ? '12px' : '24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragOver ? '#ECFDF5' : '#F9FAFB',
          transition: 'all 0.15s ease',
          maxWidth: 320,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={uploading}
        />

        {uploading ? (
          <div>
            <div style={{
              width: 20,
              height: 20,
              position: 'relative',
              margin: '0 auto 6px',
            }}>
              <svg viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle cx="12" cy="12" r="10" fill="none" stroke="#0F766E" strokeWidth="3"
                  strokeDasharray="62.83" strokeDashoffset="47.12"
                  strokeLinecap="round" style={{ transformOrigin: 'center' }} />
              </svg>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {status || 'Uploading...'}
            </div>
            <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
          </div>
        ) : value ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #D1D5DB',
                background: '#FFFFFF',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              Replace Image
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemove() }}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 6,
                border: '1px solid #FCA5A5',
                background: '#FEF2F2',
                color: '#DC2626',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 20, marginBottom: 4, color: '#9CA3AF' }}>+</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              Choose Image or drag & drop
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
              JPG, PNG, WEBP — max 5MB
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
