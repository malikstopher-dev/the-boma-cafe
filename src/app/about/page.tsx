'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import { siteSettingsService } from '@/lib/siteSettings';
import PremiumHero from '@/components/ui/PremiumHero';

export default function AboutPage() {
  const [settings, setSettings] = useState<any>(null);
  const [aboutSettings, setAboutSettings] = useState<any>(null);

  useEffect(() => {
    setSettings(dataService.getSettings());
    setAboutSettings(siteSettingsService.getAboutSettings());
  }, []);

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        <PremiumHero
          imageUrl="/hero/hero-about.jpg"
          badge="Our Story"
          title={aboutSettings?.heroTitle || 'About The Boma Café'}
          subtitle={aboutSettings?.heroSubtitle || 'Discover the passion and tradition behind The Boma Café'}
        />

        {/* Content - Premium Design */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container" style={{ maxWidth: '1100px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
              <div>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--warm), var(--warm-light))',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--dark-brown)',
                  marginBottom: '1.25rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  Welcome
                </div>
                <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1.75rem', fontFamily: 'var(--font-display)', lineHeight: 1.3 }}>
                  {aboutSettings?.introTitle || 'Rustic Elegance in the Heart of Sandton'}
                </h2>
                <p style={{ color: 'var(--text)', marginBottom: '1.25rem', lineHeight: 1.85, fontSize: '1.05rem' }}>
                  {aboutSettings?.introDescription || 'Welcome to The Boma Cafe, where we believe dining should be an experience, not just a meal.'}
                </p>
                <p style={{ color: 'var(--text)', marginBottom: '1.25rem', lineHeight: 1.85, fontSize: '1.05rem' }}>
                  {aboutSettings?.fullDescription || 'Nestled in the vibrant area of Sandton, our open-air restaurant offers a unique escape from the hustle and bustle of city life. With our signature thatched roof, cozy firepits, and lush greenery, we have created an atmosphere that feels like a retreat to the countryside.'}
                </p>
                <p style={{ color: 'var(--text)', lineHeight: 1.85, fontSize: '1.05rem' }}>
                  {aboutSettings?.missionDescription || 'Every dish we serve is crafted with care, using fresh, locally-sourced ingredients to bring you the authentic flavors of South Africa.'}
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '-20px',
                  right: '20px',
                  bottom: '20px',
                  background: 'linear-gradient(135deg, var(--warm), var(--warm-light))',
                  borderRadius: '24px',
                  opacity: 0.4
                }} />
                <img 
                  src={aboutSettings?.heroImage || '/images/about.jpg'} 
                  alt="The Boma Cafe Interior"
                  style={{ 
                    width: '100%', 
                    borderRadius: '24px', 
                    boxShadow: 'var(--shadow-lg)',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Values - Premium Design */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
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
                What Drives Us
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>{aboutSettings?.valuesTitle || 'Our Values'}</h2>
              <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>{aboutSettings?.valuesDescription || 'What drives us every day'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
              {[
                { icon: '🍽️', title: 'Quality Food', desc: 'Fresh, locally-sourced ingredients in every dish' },
                { icon: '🔥', title: 'Warmth', desc: 'Creating cozy spaces with firepits and hospitality' },
                { icon: '🌿', title: 'Nature', desc: 'Surrounded by lush greenery and outdoor ambiance' },
                { icon: '💕', title: 'Soul', desc: 'Bringing heart and soul to every experience' }
              ].map((item, i) => (
                <div key={i} style={{ 
                  background: 'var(--white)', 
                  padding: '2rem', 
                  borderRadius: '20px', 
                  textAlign: 'center', 
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}>
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    fontSize: '1.75rem'
                  }}>{item.icon}</div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--dark-brown)', marginBottom: '0.5rem', fontWeight: 600 }}>{item.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA - Premium Design */}
        <section style={{ background: 'var(--dark-brown)', padding: 'var(--space-3xl) 5%', textAlign: 'center', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(244, 164, 96, 0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(244, 164, 96, 0.1) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div className="container" style={{ position: 'relative', zIndex: 1 }}>
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
              Visit Us
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>Come Experience Us</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>We can't wait to welcome you to The Boma Cafe</p>
            <a href="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>Get in Touch</a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}