'use client';

import { useState, useEffect } from 'react';

interface AnnouncementBarProps {
  text?: string;
}

export default function AnnouncementBar({ text }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    try {
      const closed = sessionStorage.getItem('announcement_bar_closed');
      if (closed) {
        setIsClosed(true);
      }
    } catch { /* sessionStorage unavailable */ }
  }, []);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!text || isClosed) return;
    const timer = setTimeout(() => setIsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [text, isClosed]);

  if (!text || !isVisible || isClosed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1001,
      background: 'linear-gradient(135deg, #2C1E1A 0%, #3D2B22 100%)',
      padding: '0.6rem 1rem',
      borderBottom: '1px solid rgba(244, 164, 96, 0.3)',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: '0.75rem' }}>
        <p style={{ color: '#F5EDE3', fontSize: '0.85rem', textAlign: 'center', fontWeight: 500, margin: 0 }}>
          {text}
        </p>
        <button
          onClick={() => {
            setIsVisible(false);
            setIsClosed(true);
            try { sessionStorage.setItem('announcement_bar_closed', 'true'); } catch {}
          }}
          aria-label="Close announcement"
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            color: '#F5EDE3',
            cursor: 'pointer',
            padding: 0,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}