'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export default function ScrollIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setIsVisible(winScroll > 400);
      if (barRef.current) {
        barRef.current.style.top = `max(0%, min(${scrolled}%, 76%))`;
      }
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 990,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          width: '4px',
          height: '120px',
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '2px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          ref={barRef}
          style={{
            position: 'absolute',
            left: '0',
            top: '0%',
            width: '4px',
            height: '24px',
            background: 'rgba(139, 90, 43, 0.6)',
            borderRadius: '2px',
            willChange: 'top',
          }}
        />
      </div>
    </div>
  );
}
