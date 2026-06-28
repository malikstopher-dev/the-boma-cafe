'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Image from 'next/image';

interface OptimizedHeroProps {
  poster: string;
  videoSrc: string;
  mobileVideoSrc?: string;
  className?: string;
  children?: ReactNode;
}

export default function OptimizedHero({
  poster,
  videoSrc,
  mobileVideoSrc,
  className,
  children,
}: OptimizedHeroProps) {
  const [loadVideo, setLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const idleCallback = window.requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
    const id = idleCallback(() => setLoadVideo(true));
    return () => {
      if (typeof id === 'number') clearTimeout(id);
    };
  }, []);

  const activeVideoSrc = isMobile && mobileVideoSrc ? mobileVideoSrc : videoSrc;
  const showVideo = loadVideo && activeVideoSrc;

  return (
    <div className={className} style={{
      position: 'relative',
      height: '100svh',
      minHeight: '600px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1a0f0a',
    }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
      </div>

      {showVideo && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={poster}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: videoReady ? 1 : 0,
              transition: 'opacity 0.8s ease',
            }}
            onCanPlay={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
          >
            <source src={activeVideoSrc} type="video/mp4" />
          </video>
        </div>
      )}

      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, transparent 0%, rgba(26,15,10,0.02) 50%, rgba(26,15,10,0.1) 100%)',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        color: 'var(--white)',
        maxWidth: '900px',
        padding: '0 5%',
      }}>
        {children}
      </div>
    </div>
  );
}
