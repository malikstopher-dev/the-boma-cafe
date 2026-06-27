'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyHeroVideoProps {
  src: string;
  poster?: string;
  loop?: boolean;
}

export default function LazyHeroVideo({ src, poster, loop = true }: LazyHeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="hero-video-container"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#1a0f0a',
      }}
    >
      {visible && (
        <video
          autoPlay
          muted
          loop={loop}
          playsInline
          preload="metadata"
          poster={poster}
          className="hero-video"
        >
          <source src={src} type="video/mp4" />
        </video>
      )}
    </div>
  );
}
