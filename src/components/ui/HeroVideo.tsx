'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface HeroVideoProps {
  videoSrc: string;
  mobileSrc?: string;
  title?: string;
  subtitle?: string;
  loop?: boolean;
  poster?: string;
  badge?: string;
  minHeight?: string;
  lazy?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function HeroVideo({
  videoSrc,
  mobileSrc,
  title,
  subtitle,
  loop = true,
  poster = '/videos/hero-poster.jpg',
  badge,
  minHeight = '100vh',
  lazy = true,
  children,
  className,
}: HeroVideoProps) {
  const [videoReady, setVideoReady] = useState(false);
  const [visible, setVisible] = useState(!lazy);
  const [isMobile, setIsMobile] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!lazy) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const handleCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  return (
    <section ref={sectionRef} className={className} style={{
      position: 'relative',
      height: isMobile ? '100svh' : undefined,
      minHeight: minHeight === '100vh' ? '100svh' : minHeight,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a0f0a',
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        {visible && (
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: isMobile ? 'center center' : undefined,
              opacity: videoReady ? 1 : 0,
              transition: 'opacity 0.8s ease',
            }}
            autoPlay
            muted
            loop={loop}
            playsInline
            preload="metadata"
            poster={poster}
            onCanPlay={handleCanPlay}
            onLoadedData={handleCanPlay}
          >
            <source src={isMobile && mobileSrc ? mobileSrc : videoSrc} type="video/mp4" />
          </video>
        )}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, transparent 0%, rgba(26, 15, 10, 0.02) 50%, rgba(26, 15, 10, 0.1) 100%)',
        }} />
      </div>

      {(title || subtitle || badge) && (
        <div style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          color: 'var(--white)',
          maxWidth: '900px',
          padding: '0 5%',
          opacity: videoReady ? 1 : 0,
          transform: videoReady ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          {badge && (
            <div style={{
              display: 'inline-block',
              background: 'var(--warm)',
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              {badge}
            </div>
          )}
          {title && (
            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              marginBottom: subtitle ? '1rem' : 0,
              lineHeight: 1.2,
              color: 'var(--white)',
              textShadow: '0 3px 20px rgba(0, 0, 0, 0.4)',
            }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              fontStyle: 'italic',
              color: 'var(--cream)',
              maxWidth: '650px',
              margin: '0 auto 1.5rem',
            }}>
              {subtitle}
            </p>
          )}
          {children && (
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {children}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
