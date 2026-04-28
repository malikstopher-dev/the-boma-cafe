'use client';

import { useState, useEffect, useCallback } from 'react';

export default function ScrollControl() {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const handleScroll = useCallback(() => {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    setScrollProgress(scrolled);
    setIsVisible(winScroll > 300);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '140px',
        zIndex: 996,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      <button
        onClick={scrollToTop}
        aria-label="Scroll to top"
        style={{
          width: '28px',
          height: '24px',
          borderRadius: '6px 6px 0 0',
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderBottom: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M6 0L0.5 8H11.5L6 0Z" fill="#6b7280" />
        </svg>
      </button>
      
      <div
        style={{
          width: '6px',
          height: '80px',
          background: '#f3f4f6',
          borderRadius: '3px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '0',
            top: `${scrollProgress}%`,
            width: '6px',
            height: '16px',
            background: '#3b82f6',
            borderRadius: '3px',
            transition: 'top 0.1s ease',
          }}
        />
      </div>
      
      <button
        onClick={scrollToBottom}
        aria-label="Scroll to bottom"
        style={{
          width: '28px',
          height: '24px',
          borderRadius: '0 0 6px 6px',
          background: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderTop: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
          <path d="M6 10L11.5 2H0.5L6 10Z" fill="#6b7280" />
        </svg>
      </button>
    </div>
  );
}