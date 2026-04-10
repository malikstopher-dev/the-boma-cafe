'use client';

import { useState, useEffect } from 'react';

interface AnnouncementBarProps {
  text?: string;
  link?: string;
  linkText?: string;
}

export default function AnnouncementBar({ text, link, linkText }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    const closed = sessionStorage.getItem('announcement_bar_closed');
    if (closed) {
      setIsClosed(true);
    }
  }, []);

  if (!text || !isVisible || isClosed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1001,
      background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
      padding: '0.6rem 1rem',
      borderBottom: '1px solid rgba(244, 164, 96, 0.3)'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', position: 'relative', gap: '1rem' }}>
        <p style={{ color: 'var(--cream)', fontSize: '0.85rem', textAlign: 'left', fontWeight: 500, flex: 1 }}>
          {text}
          {link && (
            <a href={link} style={{ color: 'var(--warm)', textDecoration: 'underline', marginLeft: '0.5rem', whiteSpace: 'nowrap' }}>
              {linkText || ' Learn more'}
            </a>
          )}
        </p>
        <button 
          onClick={() => {
            setIsClosed(true);
            sessionStorage.setItem('announcement_bar_closed', 'true');
          }}
          aria-label="Close announcement"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--cream)',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            transition: 'opacity 0.3s ease',
            flexShrink: 0
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}