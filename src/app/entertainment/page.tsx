'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import PremiumHero from '@/components/ui/PremiumHero';

const entertainmentTypes = [
  {
    icon: '🎵',
    title: 'Live DJs',
    description: 'Feel the rhythm with our talented DJs spinning curated tracks across various genres.'
  },
  {
    icon: '🎤',
    title: 'Karaoke',
    description: 'Step into the spotlight and showcase your vocals in our lively karaoke sessions.'
  },
  {
    icon: '🎸',
    title: 'Live Performances',
    description: 'Experience passionate performances from local and visiting artists.'
  }
];

export default function EntertainmentPage() {
  const [settings, setSettings] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const slideshowImages = [
    '/images/livemusic1.jpg',
    '/images/livemusic2.jpg'
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const allSettings = await cmsService.getAllSettings();
        setSettings(allSettings);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideshowImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        <div style={{ paddingTop: 80 }}>
          <PremiumHero
          imageUrl="/hero/hero-entertainment.png"
          badge="Entertainment"
          title="Live Entertainment"
          subtitle="Thursday to Sunday — music, energy, and unforgettable evenings"
        />

        {/* Introduction */}
        </div>
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--dark-brown)',
                marginBottom: '1rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Thursday - Sunday
              </div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)' }}>
                Every Weekend is a Celebration
              </h2>
              <p style={{ color: 'var(--text)', fontSize: '1.1rem', lineHeight: 1.8 }}>
                The Boma Café comes alive from Thursday to Sunday with a vibrant lineup of entertainment. 
                Whether you're here for a relaxed dinner or a night of dancing, our live music creates the perfect atmosphere.
              </p>
            </div>
          </div>
        </section>

        {/* Entertainment Types */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
              {entertainmentTypes.map((type, idx) => (
                <div key={idx} style={{
                  background: 'var(--white)',
                  padding: '2.5rem 2rem',
                  borderRadius: '20px',
                  textAlign: 'center',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '2.25rem'
                  }}>
                    {type.icon}
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--dark-brown)', marginBottom: '1rem', fontWeight: 600 }}>
                    {type.title}
                  </h3>
                  <p style={{ color: 'var(--text-light)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Weekend Atmosphere */}
        <section style={{ background: 'var(--beige)', padding: 'var(--space-3xl) 5%', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(244, 164, 96, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(244, 164, 96, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '4rem', 
              maxWidth: '1100px',
              margin: '0 auto',
              alignItems: 'center'
            }}>
              <div>
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
                  The Vibe
                </div>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1.5rem', lineHeight: 1.3 }}>
                  Weekend Evenings at The Boma Café
                </h2>
                <p style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '1.5rem' }}>
                  As the sun sets, The Boma Café transforms into the ultimate weekend destination. 
                  Gather with friends, enjoy great food and drinks, and let the music set the mood for an unforgettable evening.
                </p>
                <p style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.8 }}>
                  From energetic live performances to laid-back DJ sessions, there's always something happening.
                  And if you're in the mood to sing, our karaoke nights are always a hit.
                </p>
              </div>
              <div style={{
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop" 
                  alt="Live entertainment"
                  style={{
                    width: '100%',
                    height: 'auto',
                    aspectRatio: '4/3',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Join the Fun
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1rem' }}>
              Ready for a Night Out?
            </h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>
              Bring your friends, grab a table, and experience the energy of The Boma Café.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
                Book a Table
              </Link>
              <Link href="https://www.instagram.com/the_boma_cafe" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>
                Follow Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}