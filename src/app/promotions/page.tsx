'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PremiumHero from '@/components/ui/PremiumHero';
const DEFAULT_IMAGE = '/gallery/promotions/default.jpg';

export default function PromotionsPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [cmsPromotions, setCmsPromotions] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/cms/public', { cache: 'no-cache' }).then(r => r.json()).then(data => {
      if (data?.promotions) setCmsPromotions(data.promotions);
    }).catch(() => {});
  }, []);

  const displayPromotions = cmsPromotions.filter(p => p.isActive).map((promo, idx) => ({
    id: idx + 1,
    title: promo.title,
    description: promo.description,
    validFrom: promo.startDate || '',
    validUntil: promo.endDate || '',
    ctaText: promo.ctaText || 'Learn More',
    ctaLink: promo.ctaLink || '/promotions',
    imageIndex: idx,
  }));

  const displayImages = cmsPromotions.filter(p => p.isActive).map(p => p.image || DEFAULT_IMAGE);

  useEffect(() => {
    if (displayImages.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % displayImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [displayImages.length]);

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        <PremiumHero
          imageUrl="/hero/hero-promotions.jpg"
          badge="Special Offers"
          title="Promotions"
          subtitle="Don't miss out on our latest promotions and deals"
        />

        {displayPromotions.length > 0 && (
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--dark-brown)',
                marginBottom: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Featured Offer
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>
                {displayPromotions[currentSlide].title}
              </h2>
            </div>

            {/* Image Slider */}
            <div style={{
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              aspectRatio: '16/9',
              maxHeight: '500px'
            }}>
              {displayImages.map((img, index) => (
                <div
                  key={index}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: index === currentSlide ? 1 : 0,
                    transition: 'opacity 0.8s ease-in-out'
                  }}
                />
              ))}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, transparent 40%, rgba(26,15,10,0.7) 100%)'
              }} />
              {/* Content overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '2.5rem',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: 'var(--white)', marginBottom: '0.75rem', fontWeight: 600 }}>
                  {displayPromotions[currentSlide].title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(0.9rem, 2vw, 1rem)', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
                  {displayPromotions[currentSlide].description}
                </p>
                <Link href={displayPromotions[currentSlide].ctaLink} className="btn btn-primary" style={{ padding: '0.875rem 2rem' }}>
                  {displayPromotions[currentSlide].ctaText}
                </Link>
              </div>
              {/* Navigation arrows */}
              <button
                onClick={() => setCurrentSlide(prev => prev > 0 ? prev - 1 : displayImages.length - 1)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '1rem',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'white',
                  border: 'none',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  zIndex: 2
                }}
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentSlide(prev => (prev + 1) % displayImages.length)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '1rem',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  color: 'white',
                  border: 'none',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  zIndex: 2
                }}
              >
                ›
              </button>
              {/* Dots */}
              <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '0.5rem',
                zIndex: 2
              }}>
                {displayImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    style={{
                      width: index === currentSlide ? '24px' : '8px',
                      height: '8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: index === currentSlide ? 'var(--warm)' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {displayPromotions.length > 0 && (
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--white)',
                marginBottom: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                All Promotions
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>Current Offers</h2>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {displayPromotions.map((promo) => (
                <div key={promo.id} style={{
                  background: 'var(--cream)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}>
                  <div style={{
                    height: '160px',
                    backgroundImage: `url(${displayImages[promo.imageIndex]})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 50%, rgba(26,15,10,0.5) 100%)'
                    }} />
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--dark-brown)', marginBottom: '0.5rem', fontWeight: 600 }}>
                      {promo.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', lineHeight: 1.5 }}>
                      {promo.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cream-dark)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                        Until {new Date(promo.validUntil).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                      </span>
                      <Link href={promo.ctaLink || '/menu'} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                        {promo.ctaText || 'Learn More'} →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Newsletter */}
        <section style={{ background: 'var(--beige)', padding: 'var(--space-3xl) 5%', textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(244, 164, 96, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(244, 164, 96, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--white)', marginBottom: '1rem' }}>Stay Updated</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto' }}>Subscribe to receive exclusive offers and updates</p>
            <form style={{ display: 'flex', gap: '1rem', justifyContent: 'center', maxWidth: '500px', margin: '0 auto', flexWrap: 'wrap' }}>
              <input 
                type="email" 
                placeholder="Your email address" 
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '1rem 1.5rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontSize: '1rem'
                }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>Subscribe</button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}