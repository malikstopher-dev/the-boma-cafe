'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import FadeInSection from '@/components/ui/FadeInSection';
import PremiumHero from '@/components/ui/PremiumHero';
import styles from './page.module.css';

export default function AboutPage() {
  const [settings, setSettings] = useState<any>(null);
  const [aboutSettings, setAboutSettings] = useState<any>(null);

  useEffect(() => {
    const { dataService } = require('@/lib/data');
    const { siteSettingsService } = require('@/lib/siteSettings');
    setSettings(dataService.getSettings());
    setAboutSettings(siteSettingsService.getAboutSettings());
  }, []);

  return (
    <>
      <Header />
      <main className={styles.aboutPage}>
        <PremiumHero
          imageUrl="/hero/hero-about.jpg"
          badge="Our Story"
          title={aboutSettings?.heroTitle || 'About The Boma Café'}
          subtitle={aboutSettings?.heroSubtitle || 'Discover the passion and tradition behind The Boma Café'}
        />

        {/* Welcome / Hero Section */}
        <section className={`${styles.section} ${styles.welcomeSection}`}>
          <div className="container">
            <FadeInSection className={styles.welcomeGrid}>
              <div className={styles.welcomeContent}>
                <span className={styles.sectionBadge}>Welcome</span>
                <h2>Rustic Elegance in the Heart of Sandton</h2>
                <p>
                  Welcome to The Boma Café, where dining is not simply a meal, but a carefully crafted experience.
                </p>
                <p>
                  Set within the vibrant energy of Sandton, The Boma Café offers a refined escape from the pace of city life. Here, the atmosphere shifts, inviting guests into a space where time slows and every moment is meant to be savored.
                </p>
                <p>
                  Defined by its signature thatched architecture, warm firepit corners, and layered greenery, the space is intentionally designed to evoke the calm and authenticity of a countryside retreat, without ever leaving the city. Natural textures, open air flow, and intimate lighting come together to create an environment that feels both grounded and elevated.
                </p>
                <p>
                  It is a setting where rustic charm meets modern sophistication, where conversations linger, and where every visit unfolds into something memorable.
                </p>
              </div>
              <FadeInSection delay={200} className={styles.welcomeImageWrapper}>
                <div className={styles.welcomeImageCard}>
                  <div className={styles.welcomeImage}>
                    <img 
                      src="/gallery/venue/slide1-1980x1080.jpeg" 
                      alt="The Boma Café Interior"
                      loading="lazy"
                    />
                  </div>
                </div>
              </FadeInSection>
            </FadeInSection>
          </div>
        </section>

        {/* Our Story Section */}
        <section className={`${styles.section} ${styles.storySection}`}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>Our Story</span>
              <h2 className={styles.sectionTitle}>A Journey of Passion</h2>
              <p className={styles.sectionSubtitle}>
                From humble beginnings to a Sandton destination
              </p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.storyGrid}>
              <div className={styles.storyContent}>
                <h3>Rooted in Excellence</h3>
                <p>
                  The story of The Boma Café begins with a vision to create something extraordinary in the heart of Sandton. What started as a dream has evolved into a premier dining destination that captures the essence of rustic elegance.
                </p>
                <p>
                  Our journey is built on the belief that exceptional dining goes beyond food — it's about creating moments that linger in memory, spaces that feel like home, and experiences that touch the soul.
                </p>
                <p>
                  Every detail, from our signature thatched architecture to our carefully curated menu, reflects a commitment to authenticity and excellence that defines who we are.
                </p>
              </div>
              <div className={styles.storyImage}>
                <img 
                  src="/gallery/venue/slide2-1980x1080.jpeg" 
                  alt="The Boma Café Story"
                  loading="lazy"
                />
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* The Experience Section */}
        <section className={`${styles.section} ${styles.experienceSection}`}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>The Experience</span>
              <h2 className={styles.sectionTitle}>Where Every Sense Awakens</h2>
              <p className={styles.sectionSubtitle}>
                A symphony of flavors, ambiance, and warm hospitality
              </p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.experienceGrid}>
              <div className={styles.experienceImage}>
                <img 
                  src="/gallery/venue/slide3-1980x1080.jpeg" 
                  alt="Dining Experience"
                  loading="lazy"
                />
              </div>
              <div className={styles.experienceContent}>
                <h3>Immersive & Memorable</h3>
                <p>
                  Step into The Boma Café and feel the transformation. The warm glow of firepits, the gentle rustle of greenery, and the inviting aroma of culinary excellence create an atmosphere that immediately puts you at ease.
                </p>
                <p>
                  Our open-air design embraces the natural beauty of South Africa while offering the refined comforts of modern luxury. Whether you're here for a romantic dinner, a family celebration, or a quiet moment of reflection, every visit is crafted to be distinctive.
                </p>
                <p>
                  From the careful plating of each dish to the attentive yet unobtrusive service, we've curated every element to ensure your time with us is nothing short of extraordinary.
                </p>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* The Vision Section */}
        <section className={`${styles.section} ${styles.visionSection}`}>
          <div className="container">
            <FadeInSection className={styles.visionContent}>
              <span className={styles.sectionBadge} style={{ background: 'var(--primary)', color: 'var(--white)' }}>The Vision</span>
              <h3>A Clear & Intentional Purpose</h3>
              
              <div className={styles.visionQuote}>
                <p>
                  "A place where food, atmosphere, and people come together."
                </p>
              </div>

              <p>
                This is not simply a statement — it is a design principle embedded into every layer of The Boma Café. From the warmth of our interiors to the rhythm of our service, from the curation of our menu to the energy of our space, every detail is considered, deliberate, and aligned.
              </p>
              <p>
                The result is an environment that feels both grounded and elevated. Rustic textures meet modern refinement. Comfort meets sophistication. Familiarity meets discovery.
              </p>
            </FadeInSection>
          </div>
        </section>

        {/* Founder Section */}
        <section className={`${styles.section} ${styles.founderSection}`}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>Our Founder</span>
              <h2 className={styles.sectionTitle}>Meet the Visionary</h2>
              <p className={styles.sectionSubtitle}>
                The passion and heart behind The Boma Café
              </p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.founderGrid}>
              <div className={styles.founderImageWrapper}>
                <div className={styles.founderImageCard}>
                  <div className={styles.founderImage}>
                    <img 
                      src="/gallery/people/mahendra.jpg" 
                      alt="Mahendra Singh - Founder of The Boma Café"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.founderContent}>
                <span className={styles.founderLabel}>Founder & Owner</span>
                <h3 className={styles.founderName}>Mahendra Singh</h3>
                <p className={styles.founderTitle}>Hospitality Entrepreneur</p>

                <div className={styles.founderStory}>
                  <p>
                    Mahendra Singh is the driving force behind The Boma Café Sandton, a hospitality concept shaped by precision, experience, and a deep understanding of what truly defines a memorable dining destination.
                  </p>
                  <p>
                    With a strong foundation built within Pick n Pay and further refined through entrepreneurial ventures such as 101 on Fraser, he brings together operational discipline and an instinct for elevated guest experiences.
                  </p>
                  <p>
                    His approach is deliberate, detail-driven, and uncompromising. Every element, from service flow to ambience, is curated with intention.
                  </p>

                  <div className={styles.founderQuote}>
                    <p>
                      "A place where food, atmosphere, and people come together."
                    </p>
                  </div>

                  <p>
                    Under his direction, The Boma Café is more than a venue. It is an experience. A space where rustic authenticity meets modern refinement, where energy meets elegance, and where every visit is designed to feel distinctive, immersive, and worth returning to.
                  </p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* Values Section */}
        <section className={`${styles.section} ${styles.valuesSection}`}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className={styles.sectionBadge}>What Drives Us</span>
              <h2 className={styles.sectionTitle}>Our Values</h2>
              <p className={styles.sectionSubtitle}>
                The principles that guide everything we do
              </p>
            </FadeInSection>

            <FadeInSection delay={200} className={styles.valuesGrid}>
              {[
                { icon: '🍽️', title: 'Quality Food', desc: 'Fresh, locally-sourced ingredients in every dish' },
                { icon: '🔥', title: 'Warmth', desc: 'Creating cozy spaces with firepits and hospitality' },
                { icon: '🌿', title: 'Nature', desc: 'Surrounded by lush greenery and outdoor ambiance' },
                { icon: '💕', title: 'Soul', desc: 'Bringing heart and soul to every experience' }
              ].map((item, i) => (
                <div key={i} className={styles.valueCard}>
                  <div className={styles.valueIcon}>{item.icon}</div>
                  <h4>{item.title}</h4>
                  <p>{item.desc}</p>
                </div>
              ))}
            </FadeInSection>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`${styles.section} ${styles.ctaSection}`}>
          <div className="container">
            <FadeInSection className={styles.ctaContent}>
              <span className={styles.sectionBadge} style={{ background: 'var(--primary)', color: 'var(--white)' }}>Visit Us</span>
              <h2>Come Experience Us</h2>
              <p>
                We can't wait to welcome you to The Boma Café
              </p>
              <a href="/contact" className={styles.ctaButton}>Get in Touch</a>
            </FadeInSection>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
