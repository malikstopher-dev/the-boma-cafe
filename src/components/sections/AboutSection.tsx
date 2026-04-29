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
              {introDescription || 'Welcome to The Boma Café, where dining is not simply a meal, but a carefully crafted experience.'}
            </p>
            <p>
              {fullDescription || 'Set within the vibrant energy of Sandton, The Boma Café offers a refined escape from the pace of city life. Here, the atmosphere shifts, inviting guests into a space where time slows and every moment is meant to be savored.'}
            </p>
            <p>
              Defined by its signature thatched architecture, warm firepit corners, and layered greenery, the space is intentionally designed to evoke the calm and authenticity of a countryside retreat, without ever leaving the city. Natural textures, open air flow, and intimate lighting come together to create an environment that feels both grounded and elevated.
            </p>
            <p>
              It is a setting where rustic charm meets modern sophistication, where conversations linger, and where every visit unfolds into something memorable.
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
