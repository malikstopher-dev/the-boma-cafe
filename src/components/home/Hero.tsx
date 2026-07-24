'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import OptimizedHero from '@/components/ui/OptimizedHero';
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
    cta: 'Book Your Event',
    ctaLink: '/book-event'
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
    ctaLink: '/experience'
  }
];

export default function Hero({ title, subtitle }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  const slide = slides[currentSlide];

  const renderContent = () => (
    <div className={`${styles.content} ${isMobile ? styles.mobileContent : ''} ${isLoaded ? styles.visible : ''}`}>
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
        <Link href="/book-event" className="btn btn-primary">
          Book Your Event
        </Link>
        <Link href="/menu" className="btn btn-ghost">
          View Menu
        </Link>
      </div>
    </div>
  );

  return (
    <section className={styles.hero} style={isMobile ? { marginTop: '-60px' } : undefined}>
      <div style={{ position: 'relative' }}>
        <OptimizedHero
          poster="/videos/hero-poster.jpg"
          videoSrc="/videos/boma-hero.mp4"
          mobileVideoSrc="/videos/mobile-hero.mp4"
        >
          {!isMobile && renderContent()}
        </OptimizedHero>

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
      </div>

      {isMobile && renderContent()}

      <div className={styles.mobileCtas}>
        <Link href="/book-event" className={styles.mobileCtaPrimary}>Book Event</Link>
        <Link href="/about" className={styles.mobileCta}>Discover</Link>
        <Link href="/menu" className={styles.mobileCta}>View Menu</Link>
        <Link href="/contact" className={styles.mobileCta}>Book a Table</Link>
        <Link href="/experience" className={styles.mobileCta}>View Events</Link>
      </div>
    </section>
  );
}
