'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import { siteSettingsService } from '@/lib/siteSettings';

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
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '6rem 5%',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>{aboutSettings?.heroTitle || 'Our Story'}</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            {aboutSettings?.heroSubtitle || 'Discover the passion and tradition behind The Boma Cafe'}
          </p>
        </section>

        {/* Content */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container" style={{ maxWidth: '1000px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '2.25rem', color: 'var(--dark-brown)', marginBottom: '1.5rem' }}>
                  {aboutSettings?.introTitle || 'Rustic Elegance in the Heart of Sandton'}
                </h2>
                <p style={{ color: 'var(--text)', marginBottom: '1rem', lineHeight: 1.8 }}>
                  {aboutSettings?.introDescription || 'Welcome to The Boma Cafe, where we believe dining should be an experience, not just a meal.'}
                </p>
                <p style={{ color: 'var(--text)', marginBottom: '1rem', lineHeight: 1.8 }}>
                  {aboutSettings?.fullDescription || 'Nestled in the vibrant area of Sandton, our open-air restaurant offers a unique escape from the hustle and bustle of city life. With our signature thatched roof, cozy firepits, and lush greenery, we have created an atmosphere that feels like a retreat to the countryside.'}
                </p>
                <p style={{ color: 'var(--text)', lineHeight: 1.8 }}>
                  {aboutSettings?.missionDescription || 'Every dish we serve is crafted with care, using fresh, locally-sourced ingredients to bring you the authentic flavors of South Africa.'}
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <img 
                  src={aboutSettings?.heroImage || '/images/about.jpg'} 
                  alt="The Boma Cafe Interior"
                  style={{ width: '100%', borderRadius: '20px', boxShadow: '20px 20px 0 var(--warm)' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section" style={{ background: 'var(--cream)' }}>
          <div className="container">
            <div className="section-header">
              <h2>{aboutSettings?.valuesTitle || 'Our Values'}</h2>
              <p>{aboutSettings?.valuesDescription || 'What drives us every day'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {[
                { icon: '🍽️', title: 'Quality Food', desc: 'Fresh, locally-sourced ingredients in every dish' },
                { icon: '🔥', title: 'Warmth', desc: 'Creating cozy spaces with firepits and hospitality' },
                { icon: '🌿', title: 'Nature', desc: 'Surrounded by lush greenery and outdoor ambiance' },
                { icon: '💕', title: 'Soul', desc: 'Bringing heart and soul to every experience' }
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--white)', padding: '2rem', borderRadius: '16px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{item.icon}</div>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section" style={{ background: 'var(--dark-brown)', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '1rem' }}>Come Experience Us</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem' }}>We can't wait to welcome you to The Boma Cafe</p>
            <a href="/contact" className="btn btn-primary">Get in Touch</a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}