'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import PremiumHero from '@/components/ui/PremiumHero';

const getHighlightArray = (str: string): string[] => {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s);
};

export default function ExperiencePage() {
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dining');
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

  const experiences = expSettings ? [
  {
    id: 'dining',
    title: expSettings.diningTitle || 'Dining',
    subtitle: expSettings.diningSubtitle || 'Rustic Outdoor Restaurant',
    description: expSettings.diningDescription || 'Experience authentic outdoor dining beneath our signature thatched roof.',
    highlights: getHighlightArray(expSettings.diningHighlights),
    image: expSettings.diningImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    cta: expSettings.diningCta || 'View Menu',
    ctaLink: expSettings.diningCtaLink || '/menu'
  },
  {
    id: 'puff-lounge',
    title: expSettings.puffTitle || 'Bisou El Patrona',
    subtitle: expSettings.puffSubtitle || 'A Different Vibe',
    description: expSettings.puffDescription || 'A separate lounge area with a distinct atmosphere.',
    highlights: getHighlightArray(expSettings.puffHighlights),
    image: expSettings.puffImage || 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&fit=crop',
    cta: expSettings.puffCta || 'Learn More',
    ctaLink: expSettings.puffCtaLink || '/contact'
  },
  {
    id: 'family',
    title: expSettings.familyTitle || 'Family & Activities',
    subtitle: expSettings.familySubtitle || 'Fun for All Ages',
    description: expSettings.familyDescription || 'A welcoming destination for families.',
    highlights: getHighlightArray(expSettings.familyHighlights),
    image: expSettings.familyImage || 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    cta: expSettings.familyCta || 'Plan Your Visit',
    ctaLink: expSettings.familyCtaLink || '/contact'
  }
] : [
  {
    id: 'dining',
    title: 'Dining',
    subtitle: 'Rustic Outdoor Restaurant',
    description: 'Experience authentic outdoor dining beneath our signature thatched roof. From hearty breakfasts to wood-fired pizzas and flame-grilled specialties, every meal is crafted with fresh, locally-sourced ingredients.',
    highlights: ['Thatched roof ambiance', 'Open-air seating', 'Fresh, local ingredients', 'Cozy firepits'],
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    cta: 'View Menu',
    ctaLink: '/menu'
  },
  {
    id: 'puff-lounge',
    title: 'Bisou El Patrona',
    subtitle: 'A Different Vibe',
    description: 'A separate lounge area with a distinct atmosphere from our main restaurant. Enjoy curated music, a relaxed social setting, and your own space to unwind.',
    highlights: ['Separate lounge area', 'Curated music selection', 'Relaxed social vibe', 'Intimate setting'],
    image: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800&h=600&fit=crop',
    cta: 'Learn More',
    ctaLink: '/contact'
  },
  {
    id: 'family',
    title: 'Family & Activities',
    subtitle: 'Fun for All Ages',
    description: 'A welcoming destination for families. Let the little ones explore our dedicated kiddies area, enjoy clay painting activities, and create cherished memories together.',
    highlights: ['Kiddies play area', 'Clay painting activity', 'Family-friendly atmosphere', 'Spacious outdoor setting'],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    cta: 'Plan Your Visit',
    ctaLink: '/contact'
  }
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

  const activeExperience = experiences.find(exp => exp.id === activeTab) || experiences[0];

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        <div style={{ paddingTop: 80 }}>
          <PremiumHero
          imageUrl="/hero/hero-experience.png"
          badge={expSettings?.heroBadge || 'Discover'}
          title={expSettings?.heroTitle || 'The Experience'}
          subtitle={expSettings?.heroSubtitle || 'More than just a restaurant — a destination for every occasion'}
        />

        {/* Video Showcase Section */}
        {(expSettings?.videoEnabled !== false) && (
        <div style={{ 
          position: 'relative',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 5%',
        }}>
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(26, 15, 10, 0.15)',
          }}>
            <video
              autoPlay
              muted
              loop
              playsInline
              poster="/hero/hero-experience.png"
              style={{
                width: '100%',
                display: 'block',
                background: '#1a0f0a',
              }}
            >
              <source src={expSettings?.videoPath || '/videos/gallery.mp4'} type="video/mp4" />
            </video>
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '2rem 1.5rem 1.5rem',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
              textAlign: 'center',
            }}>
              <h3 style={{
                color: 'var(--white)',
                fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
                fontWeight: 600,
                marginBottom: '0.25rem',
                fontFamily: 'var(--font-display)',
              }}>
                {expSettings?.videoTitle || 'Experience The Boma Café'}
              </h3>
              <p style={{
                color: 'var(--cream)',
                fontSize: '0.9rem',
                margin: 0,
              }}>
                {expSettings?.videoSubtitle || 'Book your table today'}
              </p>
            </div>
          </div>
        </div>
        )}

        {/* Experience Tabs */}
        </div>
        <section style={{ background: 'var(--white)', padding: 'var(--space-xl) 5%' }}>
          <div className="container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              flexWrap: 'wrap',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              {experiences.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setActiveTab(exp.id)}
                  style={{
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    border: 'none',
                    background: activeTab === exp.id 
                      ? 'linear-gradient(135deg, var(--primary), var(--secondary))' 
                      : 'var(--cream)',
                    color: activeTab === exp.id ? 'var(--white)' : 'var(--dark-brown)',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: activeTab === exp.id ? 'var(--shadow-md)' : 'none'
                  }}
                >
                  {exp.title}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Active Experience Detail */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '4rem', 
              maxWidth: '1100px',
              margin: '0 auto',
              alignItems: 'center'
            }}>
              <div style={{ order: 1 }}>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--white)',
                  marginBottom: '1rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  {activeExperience.subtitle}
                </div>
                <h2 style={{ 
                  fontSize: 'clamp(2rem, 4vw, 2.75rem)', 
                  color: 'var(--dark-brown)', 
                  marginBottom: '1.5rem',
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.2
                }}>
                  {activeExperience.title}
                </h2>
                <p style={{ 
                  color: 'var(--text)', 
                  fontSize: '1.1rem', 
                  lineHeight: 1.8,
                  marginBottom: '2rem'
                }}>
                  {activeExperience.description}
                </p>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  {activeExperience.highlights.map((highlight, idx) => (
                    <div key={idx} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      color: 'var(--dark-brown)',
                      fontSize: '0.95rem'
                    }}>
                      <span style={{
                        width: '24px',
                        height: '24px',
                        background: 'var(--warm)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        flexShrink: 0
                      }}>✓</span>
                      {highlight}
                    </div>
                  ))}
                </div>
                {activeExperience?.ctaLink ? (
                  <Link href={activeExperience.ctaLink} className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
                    {activeExperience.cta}
                  </Link>
                ) : null}
              </div>
              <div style={{ order: 2, position: 'relative' }}>
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
                <div style={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <img 
                    src={activeExperience.image} 
                    alt={activeExperience.title}
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
          </div>
        </section>

        {/* Weekend Buffet Highlight */}
        <section style={{ background: 'var(--beige)', padding: 'var(--space-3xl) 5%', textAlign: 'center', position: 'relative' }}>
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
              Weekend Special
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>
              {expSettings?.weekendTitle || 'Weekend Buffet'}
            </h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
              {expSettings?.weekendDescription || 'Join us on weekends for our signature buffet experience. Enjoy a wide variety of dishes, from aromatic curries to grilled specialties, in our relaxed outdoor setting.'}
            </p>
            <Link href={expSettings?.weekendCtaLink || '/menu'} className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
              {expSettings?.weekendCta || 'View Menu'}
            </Link>
          </div>
        </section>

        {/* CTA Section */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--white)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Plan Your Visit
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1rem' }}>
              Ready to Experience The Boma Café?
            </h2>
            <p style={{ color: 'var(--text-light)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>
              Whether you're after a romantic dinner, family outing, or social gathering, we have the perfect space for you.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
                Book a Table
              </Link>
              <Link href="/events" className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>
                Plan an Event
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}