'use client';

import Link from 'next/link';
import FadeInSection from '@/components/ui/FadeInSection';
import styles from '@/app/page.module.css';

export default function AboutSection({ 
  introTitle, 
  introDescription, 
  fullDescription, 
  heroImage,
  isPage = false 
}: { 
  introTitle?: string; 
  introDescription?: string; 
  fullDescription?: string; 
  heroImage?: string;
  isPage?: boolean;
}) {
  return (
    <section className={isPage ? styles.aboutPageSection : styles.aboutSection}>
      <div className="container">
        <div className={styles.aboutGrid}>
          <FadeInSection className={styles.aboutContent}>
            <span className="section-badge">Welcome to The Boma Cafe</span>
            <h3>{introTitle || 'Rustic Elegance in the Heart of Sandton'}</h3>
            <p>
              {introDescription || 'Welcome to The Boma Cafe, where we believe dining should be an experience, not just a meal.'}
            </p>
            <p>
              {fullDescription || 'Nestled in the vibrant area of Sandton, our open-air restaurant offers a unique escape from the hustle and bustle of city life. With our signature thatched roof, cozy firepits, and lush greenery, we have created an atmosphere that feels like a retreat to the countryside.'}
            </p>
            
            <div className={styles.aboutFeatures}>
              {[
                { icon: '🔥', title: 'Cozy Firepits', desc: 'Warm glow for romantic evenings' },
                { icon: '🌿', title: 'Lush Greenery', desc: 'Surrounded by nature' },
                { icon: '🏠', title: 'Thatched Roof', desc: 'Authentic African architecture' }
              ].map((feature, index) => (
                <div key={index} className={styles.aboutFeature}>
                  <div className={styles.aboutFeatureIcon}>{feature.icon}</div>
                  <div>
                    <strong>{feature.title}</strong>
                    <span>{feature.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {!isPage && (
              <Link href="/about" className={styles.aboutLink}>
                Learn more about us <span>→</span>
              </Link>
            )}
          </FadeInSection>
          
          <FadeInSection delay={200} animationType="scale" className={styles.aboutImageWrapper}>
            <div className={styles.aboutImage}>
              <img 
                src={heroImage || '/gallery/venue/slide1-1980x1080.jpeg'} 
                alt="Boma Cafe Interior"
              />
            </div>
          </FadeInSection>
        </div>
      </div>
    </section>
  );
}
