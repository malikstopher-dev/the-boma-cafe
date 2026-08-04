'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Image from 'next/image';

interface OptimizedHeroProps {
  poster: string;
  videoSrc: string;
  videoSrcs?: string[];
  mobileVideoSrc?: string;
  mobileVideoSrcs?: string[];
  className?: string;
  children?: ReactNode;
  contentAlign?: 'center' | 'bottom';
}

export default function OptimizedHero({
  poster,
  videoSrc,
  videoSrcs,
  mobileVideoSrc,
  mobileVideoSrcs,
  className,
  children,
  contentAlign = 'center',
}: OptimizedHeroProps) {
  const [loadVideo, setLoadVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
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

  const desktopSrcs = videoSrcs && videoSrcs.length > 0 ? videoSrcs : [videoSrc];
  const mobileSrcs = mobileVideoSrcs && mobileVideoSrcs.length > 0
    ? mobileVideoSrcs
    : (mobileVideoSrc ? [mobileVideoSrc] : desktopSrcs);
  const srcs = isMobile ? mobileSrcs : desktopSrcs;
  const activeSrc = srcs[Math.min(videoIndex, srcs.length - 1)] || videoSrc;
  const multiVideo = srcs.length > 1;

  useEffect(() => {
    setVideoIndex(0);
  }, [isMobile]);

  const showVideo = loadVideo && activeSrc;

  return (
    <div className={className} style={{
      position: 'relative',
      height: '100svh',
      minHeight: '600px',
      overflow: 'hidden',
      display: 'flex',
      alignItems: contentAlign === 'bottom' ? 'flex-end' : 'center',
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
            loop={!multiVideo}
            playsInline
            preload={multiVideo ? 'auto' : 'none'}
            poster={poster}
            src={activeSrc}
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
            onEnded={() => { if (multiVideo) setVideoIndex(i => (i + 1) % srcs.length) }}
          />
        </div>
      )}

      <div style={{
        position: 'absolute',
        inset: 0,
        background: contentAlign === 'bottom'
          ? 'linear-gradient(180deg, transparent 0%, rgba(26,15,10,0.02) 40%, rgba(26,15,10,0.45) 100%)'
          : 'linear-gradient(180deg, transparent 0%, rgba(26,15,10,0.02) 50%, rgba(26,15,10,0.1) 100%)',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        color: 'var(--white)',
        maxWidth: '900px',
        padding: contentAlign === 'bottom' ? '0 5% 4rem' : '0 5%',
      }}>
        {children}
      </div>
    </div>
  );
}
