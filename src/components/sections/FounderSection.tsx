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
                At the heart of The Boma Café Sandton is the vision of Mahendra Singh, a hospitality-driven 
                entrepreneur whose journey is defined by precision, passion, and a deep understanding of what 
                transforms a space into an experience.
              </p>
              <p>
                With a professional foundation shaped at Pick n Pay, Mahendra developed a sharp operational 
                mindset rooted in consistency, quality control, and customer-centric thinking. This early exposure 
                to large-scale retail excellence laid the groundwork for his transition into the more intimate, 
                experience-driven world of restaurants.
              </p>
              <p>
                His entrepreneurial path evolved with ventures such as 101 on Fraser, where he began refining 
                his signature approach, blending structure with creativity, efficiency with atmosphere. It is here 
                that his philosophy started to take form: that true hospitality lies not only in service, but in 
                how a space makes people feel.
              </p>
              <p>
                At The Boma Café Sandton, that philosophy is fully realized.
              </p>
              <p>
                Mahendra's vision is clear and intentional:
                <strong> A place where food, atmosphere, and people come together.</strong>
              </p>
              <p>
                This is not simply a statement, it is a design principle embedded into every layer of the café. 
                From the warmth of the interiors to the rhythm of the service, from the curation of the menu to 
                the energy of the space, every detail is considered, deliberate, and aligned.
              </p>
              <p>
                The result is an environment that feels both grounded and elevated. Rustic textures meet modern 
                refinement. Comfort meets sophistication. Familiarity meets discovery.
              </p>
              <p>
                Under Mahendra Singh's direction, The Boma Café is not just a restaurant, it is a destination 
                shaped by experience, driven by intention, and remembered for how it makes people feel long after 
                they leave.
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
