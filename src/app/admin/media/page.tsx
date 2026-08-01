'use client'

import { useState, useEffect } from 'react'
import ImageUploader from '@/components/admin/ImageUploader'

interface MediaItem {
  id: string
  url: string
  alt_text: string
  file_name: string
  file_size: number
  uploaded_at: string
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = () => {
    fetch('/api/admin/media')
      .then(async r => {
        if (!r.ok) throw new Error('Failed to load media')
        const json = await r.json()
        setMedia(json.data || [])
      })
      .catch(() => setToast({ msg: 'Failed to load media', type: 'error' }))
  }

  const onUpload = (url: string) => {
    fetchMedia()
    setToast({ msg: 'Image uploaded', type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  const remove = async (id: string) => {
    setDeleting(id)
    const res = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMedia(prev => prev.filter(m => m.id !== id))
      setToast({ msg: 'Deleted', type: 'success' })
      setTimeout(() => setToast(null), 3000)
    }
    setDeleting(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        .media-grid-item .media-overlay { opacity: 0; transition: opacity 0.2s; }
        .media-grid-item:hover .media-overlay { opacity: 1; }
      `}</style>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: 10,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: '#fff', fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Media Library</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: 4 }}>
          Upload and manage images — use URLs anywhere on the site
        </p>
      </div>

      <div style={{ maxWidth: 600, marginBottom: 40 }}>
        <ImageUploader onUpload={onUpload} />
      </div>

      <div style={{ marginBottom: 16, color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
        {media.length} images
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {media.map((item) => (
          <div
            key={item.id}
            className="media-grid-item"
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
          >
            <img
              src={item.url}
              alt={item.alt_text}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div className="media-overlay" style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <button
                onClick={() => copyUrl(item.url)}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: '#0F766E', color: '#fff',
                  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {copied === item.url ? 'Copied!' : 'Copy URL'}
              </button>
              <button
                onClick={() => remove(item.id)}
                disabled={deleting === item.id}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: 'transparent', color: '#f87171',
                  fontSize: '0.75rem', cursor: 'pointer',
                }}
              >
                {deleting === item.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '6px 8px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            }}>
              <p style={{ color: '#fff', fontSize: '0.7rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.file_name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', margin: 0 }}>
                {formatSize(item.file_size)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {media.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.3)' }}>
          <p style={{ fontSize: '0.9rem' }}>No images yet. Upload your first image above.</p>
        </div>
      )}
    </div>
  )
}
