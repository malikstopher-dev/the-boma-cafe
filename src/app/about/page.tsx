'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FadeInSection from '@/components/ui/FadeInSection';
import PremiumHero from '@/components/ui/PremiumHero';
import { cmsService } from '@/lib/client-cms';
import styles from './page.module.css';

export default function AboutPage() {
  const [allSettings, setAllSettings] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    cmsService.getAllSettings().then(setAllSettings).catch(console.error);
  }, []);

  const aboutSettings = allSettings?.about;

  const heroBadge = 'Our Story';
  const heroTitle = aboutSettings?.heroTitle || 'About The Boma Café';
  const heroSubtitle = aboutSettings?.heroSubtitle || 'Discover the passion and tradition behind The Boma Café';

  const heroContent = (
    <>
      <div style={{
        display: 'inline-block',
        background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
        padding: '0.4rem 1.25rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: 'var(--dark-brown)',
        marginBottom: '1rem',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
      }}>
        {heroBadge}
      </div>
      <h1 style={{
        fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
        color: 'var(--white)',
        marginBottom: '1rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        lineHeight: 1.15,
        textShadow: '0 3px 25px rgba(0,0,0,0.35)',
        letterSpacing: '-0.5px',
      }}>
        {heroTitle}
      </h1>
      <p style={{
        color: 'rgba(253, 248, 243, 0.92)',
        fontSize: 'clamp(1rem, 2vw, 1.2rem)',
        maxWidth: '650px',
        margin: '0 auto',
        lineHeight: 1.65,
        textShadow: '0 2px 15px rgba(0,0,0,0.25)',
      }}>
        {heroSubtitle}
      </p>
    </>
  );

  return (
    <>
      <Header />
      <main className={styles.aboutPage}>
        <div style={isMobile ? { marginTop: '-60px' } : undefined}>
          <PremiumHero
            imageUrl={aboutSettings?.heroImage || "/hero/hero-about.jpg"}
            title={heroTitle}
            subtitle={heroSubtitle}
            contentAlign={isMobile ? 'center' : 'bottom'}
            badge={!isMobile ? heroBadge : undefined}
          >
            {!isMobile && heroContent}
          </PremiumHero>
        </div>

        {isMobile && (
          <div style={{
            background: '#1a0f0a',
            padding: '2rem 5% 3rem',
            textAlign: 'center',
          }}>
            {heroContent}
          </div>
        )}

        {/* Section 1: Welcome / Our Story */}
        <section className={styles.section}>
          <div className="container">
            <FadeInSection className={styles.welcomeGrid}>
              <div className={styles.textContent}>
                <span className={styles.label}>Welcome to The Boma Café</span>
                <h2 className={styles.heading}>{aboutSettings?.introTitle || 'Rustic Elegance in the Heart of Sandton'}</h2>
                <p className={styles.bodyText}>
                  {aboutSettings?.introDescription || 'Welcome to The Boma Café, where dining is designed to be more than a meal - it is an experience.'}
                </p>
                <p className={styles.bodyText}>
                  {aboutSettings?.fullDescription || 'Set in the vibrant heart of Sandton, our open-air restaurant offers a warm escape from the pace of the city. Signature thatched architecture, glowing firepit corners, natural textures, and lush greenery come together to create a setting that feels grounded, soulful, and refined.'}
                </p>
                <p className={styles.bodyText}>
                  It is a space where rustic charm meets modern sophistication, where conversations linger, and where every visit becomes something memorable.
                </p>

                <div className={styles.featureCards}>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🔥</span>
                    <div>
                      <strong>Cozy Firepits</strong>
                      <span>Warm glow for relaxed evenings</span>
                    </div>
                  </div>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🌿</span>
                    <div>
                      <strong>Lush Greenery</strong>
                      <span>A natural open-air escape</span>
                    </div>
                  </div>
                  <div className={styles.featureCard}>
                    <span className={styles.featureIcon}>🏠</span>
                    <div>
                      <strong>Thatched Roof</strong>
                      <span>Rustic African-inspired character</span>
                    </div>
                  </div>
                </div>
              </div>

              <FadeInSection delay={200} className={styles.imageWrapper}>
                <div className={styles.imageCard}>
                  <img 
                    src={aboutSettings?.additionalImage1 || "/gallery/venue/slide1-1980x1080.jpeg"} 
                    alt="The Boma Café Interior"
                    loading="lazy"
                  />
                </div>
              </FadeInSection>
            </FadeInSection>
          </div>
        </section>

        {/* Section 2: Founder / Meet the Visionary */}
        <section className={styles.founderSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.label}>Our Founder</span>
              <h2 className={styles.heading}>{aboutSettings?.missionTitle || 'Meet the Visionary'}</h2>
              <p className={styles.subtitle}>{aboutSettings?.missionDescription || 'The passion and vision behind The Boma Café'}</p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.founderGrid}>
              <div className={styles.founderImageWrapper}>
                <div className={styles.founderImageCard}>
                  <img 
                    src="/gallery/people/mahendra.jpg" 
                    alt="Mahendra Singh - Founder of The Boma Café"
                    loading="lazy"
                  />
                </div>
              </div>

              <div className={styles.founderContent}>
                <span className={styles.founderRole}>Founder & Owner</span>
                <h3 className={styles.founderName}>Mahendra Singh</h3>
                
                <div className={styles.founderStory}>
                  <p className={styles.bodyText}>
                    At the heart of The Boma Café Sandton is the vision of Mahendra Singh, a hospitality-driven entrepreneur with a strong understanding of what turns a restaurant into a destination.
                  </p>
                  <p className={styles.bodyText}>
                    With a professional foundation shaped at Pick n Pay and later refined through ventures such as 101 on Fraser, Mahendra brings together operational discipline, creativity, and a deep instinct for guest experience.
                  </p>
                  <p className={styles.bodyText}>
                    His approach is intentional and detail-driven. From atmosphere and service flow to menu curation and ambience, every element is designed to make guests feel welcomed, relaxed, and connected.
                  </p>

                  <div className={styles.quoteCard}>
                    <p>"A place where food, atmosphere, and people come together."</p>
                  </div>

                  <p className={styles.bodyText}>
                    Under Mahendra Singh's direction, The Boma Café is more than a restaurant. It is a destination shaped by warmth, authenticity, and memorable experiences.
                  </p>
                </div>

                <div className={styles.highlightCards}>
                  <div className={styles.highlightCard}>
                    <span className={styles.highlightIcon}>🏪</span>
                    <div>
                      <strong>Pick n Pay Experience</strong>
                      <span>Foundation in retail excellence</span>
                    </div>
                  </div>
                  <div className={styles.highlightCard}>
                    <span className={styles.highlightIcon}>✨</span>
                    <div>
                      <strong>101 on Fraser</strong>
                      <span>Proven hospitality venture</span>
                    </div>
                  </div>
                  <div className={styles.highlightCard}>
                    <span className={styles.highlightIcon}>👔</span>
                    <div>
                      <strong>Guest Experience</strong>
                      <span>Detail-driven hospitality leadership</span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Section 3: Our Values */}
        <section className={styles.valuesSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.label}>What Drives Us</span>
              <h2 className={styles.heading}>{aboutSettings?.valuesTitle || 'Our Values'}</h2>
              <p className={styles.subtitle}>{aboutSettings?.valuesDescription || 'Quality, warmth, nature, and soul guide everything we do.'}</p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.valuesGrid}>
              <div className={styles.valueCard}>
                <span className={styles.valueIcon}>🍽️</span>
                <h4>Quality Food</h4>
                <p>Fresh, flavourful dishes made with care</p>
              </div>
              <div className={styles.valueCard}>
                <span className={styles.valueIcon}>🔥</span>
                <h4>Warmth</h4>
                <p>Welcoming service and relaxed firepit energy</p>
              </div>
              <div className={styles.valueCard}>
                <span className={styles.valueIcon}>🌿</span>
                <h4>Nature</h4>
                <p>Open-air dining surrounded by greenery</p>
              </div>
              <div className={styles.valueCard}>
                <span className={styles.valueIcon}>💕</span>
                <h4>Soul</h4>
                <p>Every visit designed to feel memorable</p>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Section 4: Visit Us */}
        <section className={styles.ctaSection}>
          <div className="container">
            <FadeInSection className={styles.ctaContent}>
              <span className={styles.label}>Visit Us</span>
              <h2 className={styles.heading}>Come Experience Us</h2>
              <p className={styles.bodyText}>
                Escape the city and experience rustic charm, soulful food, and warm hospitality in the heart of Sandton.
              </p>
              <a href="/contact" className={styles.ctaButton}>Get in Touch</a>
            </FadeInSection>
          </div>
        </section>
      </main>
      <Footer settings={allSettings} />
    </>
  );
}
