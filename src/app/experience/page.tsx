'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import PremiumHero from '@/components/ui/PremiumHero';
import { getReservationLink } from '@/data/businessInfo';

function VideoSection() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observerRef.current?.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observerRef.current.observe(node);
  }, []);

  return (
    <section id="video-section" ref={containerRef} style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', color: 'var(--dark-brown)', marginBottom: '0.75rem' }}>
            Experience The Boma Café
          </h2>
          <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>
            Watch the atmosphere, energy, and experience of The Boma Café
          </p>
        </div>
        <div style={{
          background: 'var(--white)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(26, 15, 10, 0.12)'
        }}>
          <video
            controls
            preload="metadata"
            poster="/images/about.jpg"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {shouldLoad && <source src="/videos/gallery.mp4" type="video/mp4" />}
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </section>
  );
}

export default function ExperiencePage() {
  const [settings, setSettings] = useState<any>(null);
  const [expSettings, setExpSettings] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const allSettings = await cmsService.getAllSettings();
        setSettings(allSettings);
        if (allSettings.experience) {
          setExpSettings(allSettings.experience);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadData();
  }, []);

  const experiencePillars = [
    {
      title: 'Outdoor Dining',
      description: 'Dine beneath our signature thatched roof — open-air seating with views of the firepits.',
      icon: '🍽️',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'
    },
    {
      title: 'Firepit Evenings',
      description: 'Gather around glowing firepits — perfect for cold nights, good conversations, and warm drinks.',
      icon: '🔥',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop'
    },
    {
      title: 'Weekend Buffet',
      description: 'Saturday & Sunday breakfast buffet — fresh spreads, hot dishes, and relaxed weekend vibes.',
      icon: '🥞',
      image: '/gallery/events/images (12).jpg'
    },
    {
      title: 'Family Gatherings',
      description: 'Spacious grounds, kids play area, and welcoming atmosphere for celebrations of all sizes.',
      icon: '👨‍👩‍👧‍👦',
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop'
    }
  ];

  const galleryPreview = [
    '/gallery/gallery/bomacafe2-large-1.jpg',
    '/gallery/venue/2025-04-14.webp',
    '/gallery/events/2025-04-23.webp',
    '/gallery/people/boma1-1152x864.jpeg'
  ];

  const reservationLink = getReservationLink();

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        <div style={{ paddingTop: 80 }}>
          <PremiumHero
            imageUrl="/hero/hero-experience.png"
            badge={expSettings?.heroBadge || 'Discover'}
            title="The Boma Experience"
            subtitle="More than dining — warmth, fire, food and unforgettable moments."
          />
        </div>

        {/* 2. INTRO SECTION */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ 
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
              color: 'var(--dark-brown)', 
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)',
              lineHeight: 1.2
            }}>
              Where Fire, Food & Atmosphere Come Together
            </h2>
            <p style={{ 
              color: 'var(--text)', 
              maxWidth: '700px', 
              margin: '0 auto',
              fontSize: '1.1rem',
              lineHeight: 1.8
            }}>
              The Boma Café is more than a restaurant — it's a warm open-air social experience in Paulshof, Sandton. 
              From lazy weekend mornings to lively evenings by the fire, every visit feels like coming home.
            </p>
          </div>
        </section>

        {/* 3. EXPERIENCE PILLARS */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ 
                fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', 
                color: 'var(--dark-brown)',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.5rem'
              }}>
                The Experience
              </h2>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {experiencePillars.map((pillar, idx) => (
                <div key={idx} style={{
                  background: 'var(--cream)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px rgba(26, 15, 10, 0.06)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ height: '160px', overflow: 'hidden' }}>
                    <img 
                      src={pillar.image} 
                      alt={pillar.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{ padding: '1.25rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{pillar.icon}</div>
                    <h3 style={{ 
                      fontSize: '1.15rem', 
                      color: 'var(--dark-brown)', 
                      marginBottom: '0.5rem',
                      fontWeight: 600
                    }}>
                      {pillar.title}
                    </h3>
                    <p style={{ 
                      color: 'var(--text-light)', 
                      fontSize: '0.9rem', 
                      lineHeight: 1.6,
                      margin: 0
                    }}>
                      {pillar.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. WEEKEND BUFFET FEATURE */}
        <section style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
          padding: 'var(--space-3xl) 5%',
          textAlign: 'center'
        }}>
          <div className="container">
            <div style={{
              display: 'inline-block',
              background: 'var(--warm)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1.25rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Weekend Breakfast Buffet
            </div>
            <h2 style={{ 
              fontSize: 'clamp(2rem, 5vw, 3rem)', 
              color: 'var(--white)', 
              marginBottom: '1rem',
              fontFamily: 'var(--font-display)'
            }}>
              Saturday & Sunday
            </h2>
            <p style={{ 
              color: 'var(--cream)', 
              fontSize: '1.25rem',
              marginBottom: '0.5rem'
            }}>
              9:30 AM — 12:30 PM
            </p>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '2rem', 
              marginBottom: '2rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--white)' }}>R89</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Adults</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--white)' }}>R45</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Kids</div>
              </div>
            </div>
            <p style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '0.9rem',
              marginBottom: '2rem',
              maxWidth: '500px',
              margin: '0 auto 2rem'
            }}>
              Fresh pastries, hot breakfast items, fruit spreads, juices, and more
            </p>
            <a 
              href={reservationLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '1rem 2.5rem',
                background: 'var(--white)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
                transition: 'all 0.3s ease'
              }}
            >
              Book via WhatsApp
            </a>
          </div>
        </section>

        {/* 5. VENUE + EVENTS */}
        <section style={{ background: 'var(--beige)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ 
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
              color: 'var(--dark-brown)', 
              marginBottom: '1.5rem',
              fontFamily: 'var(--font-display)'
            }}>
              Celebrate at The Boma
            </h2>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1.5rem', 
              flexWrap: 'wrap',
              marginBottom: '2rem'
            }}>
              {['Birthdays', 'Private Events', 'Music Nights', 'Venue Hire'].map((item, idx) => (
                <div key={idx} style={{
                  background: 'var(--cream)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.9rem',
                  color: 'var(--dark-brown)'
                }}>
                  {item}
                </div>
              ))}
            </div>
            <Link href="/events" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
              View Events & Venue Hire
            </Link>
          </div>
        </section>

        <VideoSection />

        {/* 7. GALLERY TEASER */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-2xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ 
                fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', 
                color: 'var(--dark-brown)',
                fontFamily: 'var(--font-display)'
              }}>
                A glimpse of the atmosphere
              </h3>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '0.75rem',
              maxWidth: '1000px',
              margin: '0 auto'
            }}>
              {galleryPreview.map((img, idx) => (
                <div key={idx} style={{
                  aspectRatio: '1',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={img} 
                    alt={`Boma atmosphere ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
              <Link href="/gallery" style={{ 
                color: 'var(--primary)', 
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                View Full Gallery →
              </Link>
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ 
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
              color: 'var(--dark-brown)', 
              marginBottom: '2rem',
              fontFamily: 'var(--font-display)'
            }}>
              Ready to Experience The Boma?
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/menu" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
                View Menu
              </Link>
              <Link href="/contact" className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>
                Book Table
              </Link>
              <a 
                href={reservationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ padding: '1rem 2rem' }}
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}