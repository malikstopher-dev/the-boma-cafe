'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './Hero.module.css';

interface HeroProps {
  title?: string;
  subtitle?: string;
}

const slides = [
  {
    subtitle: 'Welcome to',
    title: 'The Boma Cafe',
    tagline: 'Where the Rustic Meets the Soulful!',
    cta: 'Book a Table',
    ctaLink: '/contact'
  },
  {
    subtitle: 'Escape the City',
    title: 'Rustic Ambiance',
    tagline: 'Savor your meal beneath a thatched roof',
    cta: 'Discover More',
    ctaLink: '/about'
  },
  {
    subtitle: 'More Than Just a Cafe',
    title: 'An Experience',
    tagline: 'Where nature meets the warmth of home',
    cta: 'View Events',
    ctaLink: '/events'
  }
];

export default function Hero({ title, subtitle }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleVideoCanPlay = useCallback(() => {
    setVideoReady(true);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        <video
          ref={videoRef}
          className={`${styles.video} ${videoReady ? styles.videoReady : ''}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero-poster.jpg"
          onCanPlay={handleVideoCanPlay}
        >
          <source src="/videos/boma-hero.mp4" type="video/mp4" />
        </video>
        <div className={styles.videoOverlay} />
      </div>

      <div className={`${styles.content} ${isLoaded ? styles.visible : ''}`}>
        <p className={styles.subtitle}>{slide.subtitle}</p>

        {title ? (
          <h1 className={styles.title}>{title}</h1>
        ) : (
          <h1 className={styles.title}>{slide.title}</h1>
        )}

        <p className={styles.tagline}>{slide.tagline}</p>

        <div className={styles.cta}>
          <Link href={slide.ctaLink} className="btn btn-primary">
            {slide.cta}
          </Link>
          <Link href="/menu" className="btn btn-ghost">
            View Menu
          </Link>
        </div>
      </div>

      <div className={styles.nav}>
        {slides.map((_, index) => (
          <button
            key={index}
            className={`${styles.dot} ${index === currentSlide ? styles.activeDot : ''}`}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className={styles.scroll}>
        <span>Scroll</span>
        <div className={styles.scrollIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </div>
    </section>
  );
}
