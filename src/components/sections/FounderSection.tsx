'use client';

import FadeInSection from '@/components/ui/FadeInSection';
import styles from '@/app/page.module.css';

export default function FounderSection() {
  return (
    <section className={styles.founderSection}>
      <div className="container">
        <FadeInSection className={styles.sectionHeader}>
          <span className="section-badge">Our Founder</span>
          <h2>Meet the Visionary</h2>
          <p>The passion and heart behind The Boma Cafe</p>
        </FadeInSection>

        <FadeInSection delay={200} className={styles.founderGrid}>
          <div className={styles.founderImageWrapper}>
            <div className={styles.founderImage}>
              <img 
                src="/gallery/people/mahendra.jpg" 
                alt="Mahendra Singh - Founder of The Boma Cafe"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
          
          <div className={styles.founderContent}>
            <h3 className={styles.founderName}>Mahendra Singh</h3>
            <p className={styles.founderTitle}>Founder & Owner</p>
            
            <div className={styles.founderStory}>
              <p>
                Mahendra Singh is the visionary behind The Boma Cafe Sandton, bringing a refined approach 
                to hospitality shaped by years of experience in retail and restaurant operations.
              </p>
              <p>
                Having built his foundation with Pick n Pay and later creating ventures such as 101 on Fraser, 
                he combines business insight with a passion for exceptional guest experiences.
              </p>
              <p>
                His vision: "A place where food, atmosphere, and people come together." Every detail at 
                The Boma Cafe reflects his commitment to creating unforgettable experiences that blend rustic 
                charm with modern sophistication.
              </p>
            </div>

            <div className={styles.founderValues}>
              <div className={styles.founderValue}>
                <span className={styles.founderValueIcon}>🏪</span>
                <div>
                  <strong>Pick n Pay Experience</strong>
                  <span>Built foundation in retail excellence</span>
                </div>
              </div>
              <div className={styles.founderValue}>
                <span className={styles.founderValueIcon}>✨</span>
                <div>
                  <strong>Creator of 101 on Fraser</strong>
                  <span>Proven track record in hospitality ventures</span>
                </div>
              </div>
              <div className={styles.founderValue}>
                <span className={styles.founderValueIcon}>👔</span>
                <div>
                  <strong>Hospitality Leadership</strong>
                  <span>Decades of experience in guest experiences</span>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}
