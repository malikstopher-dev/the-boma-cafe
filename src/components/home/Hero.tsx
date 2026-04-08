'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Hero.module.css';

interface HeroProps {
  title?: string;
  subtitle?: string;
}

const slides = [
  {
    image: '/hero/slide1.jpg',
    subtitle: 'Welcome to',
    title: 'The Boma Cafe',
    tagline: 'Where the Rustic Meets the Soulful!',
    cta: 'Book a Table',
    ctaLink: '/contact'
  },
  {
    image: '/hero/slide2.jpg',
    subtitle: 'Escape the City',
    title: 'Rustic',
    titleAccent: 'Ambiance',
    tagline: 'Savor your meal beneath a thatched roof',
    cta: 'Discover More',
    ctaLink: '/about'
  },
  {
    image: '/hero/slide3.jpg',
    subtitle: 'More Than Just a Cafe',
    title: 'An',
    titleAccent: 'Experience',
    tagline: 'Where nature meets the warmth of home',
    cta: 'View Events',
    ctaLink: '/events'
  }
];

export default function Hero({ title, subtitle }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section className={styles.hero}>
      <div className={styles.slides}>
        {slides.map((s, index) => (
          <div 
            key={index} 
            className={`${styles.slide} ${index === currentSlide ? styles.active : ''}`}
            style={{ backgroundImage: `url(${s.image})` }}
          />
        ))}
        <div className={styles.overlay} />
      </div>

      <div className={`${styles.content} ${isLoaded ? styles.visible : ''}`}>
        <p className={styles.subtitle}>{slide.subtitle}</p>
        
        {title ? (
          <h1 className={styles.title}>{title}</h1>
        ) : (
          <>
            <h1 className={styles.title}>
              {slide.title}
              {slide.titleAccent && (
                <span className={styles.accent}> {slide.titleAccent}</span>
              )}
            </h1>
          </>
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