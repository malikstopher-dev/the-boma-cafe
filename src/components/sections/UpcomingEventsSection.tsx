'use client';

import Link from 'next/link';
import FadeInSection from '@/components/ui/FadeInSection';
import Slideshow from '@/components/ui/Slideshow';
import styles from '@/app/page.module.css';

const eventSlideshowImages = [
  { src: '/gallery/events/events-slideshow/slide/eventslide1.jpeg', alt: 'Boma Café event celebration' },
  { src: '/gallery/events/events-slideshow/slide/eventslide2.jpeg', alt: 'Live music at The Boma Café' },
  { src: '/gallery/events/events-slideshow/slide/eventslide3.jpeg', alt: 'Corporate event venue' },
  { src: '/gallery/events/events-slideshow/slide/eventslide4.jpeg', alt: 'Birthday celebration' },
  { src: '/gallery/events/events-slideshow/slide/eventslide5.jpeg', alt: 'Buffet experience' },
  { src: '/gallery/events/events-slideshow/slide/eventslide6.jpeg', alt: 'Private dining' },
  { src: '/gallery/events/events-slideshow/slide/eventslide7.jpg', alt: 'Group booking' },
  { src: '/gallery/events/events-slideshow/slide/whatsapp-2026-04-29-081057-1.jpeg', alt: 'Event celebration' },
  { src: '/gallery/events/events-slideshow/slide/whatsapp-2026-04-29-081058-2.jpeg', alt: 'Special occasion' },
];

export default function UpcomingEventsSection() {
  return (
    <section className={styles.eventsSection}>
      <div className="container">
        <FadeInSection className={styles.sectionHeader}>
          <span className="section-badge primary">What&apos;s Happening</span>
          <h2>Upcoming Events</h2>
          <p>Join us for memorable experiences</p>
        </FadeInSection>

        {/* Premium Slideshow */}
        <FadeInSection className={styles.eventSlideshowWrapper}>
          <Slideshow images={eventSlideshowImages} autoPlayInterval={5000} aspectRatio="16/9" />
        </FadeInSection>

        {/* Event Cards Grid */}
        <div className={styles.eventsGrid}>
          <FadeInSection delay={200} className={styles.eventCardWrapper}>
            <Link href="/experience" className={styles.eventCard}>
              <div className={styles.eventCardImage}>
                <img src="/gallery/weekend-buffet.jpg" alt="Weekend Breakfast Buffet" loading="lazy" decoding="async" />
                <div className={styles.eventOverlay} />
                <div className={styles.eventDate}>
                  <span className={styles.eventDay}>SAT</span>
                  <span className={styles.eventMonth}>SUN</span>
                </div>
              </div>
              <div className={styles.eventCardContent}>
                <h4>Weekend Breakfast Buffet</h4>
                <p>Start your weekend with our delicious all-you-can-eat breakfast spread</p>
                <div className={styles.eventMeta}>
                  <span>📍 The Boma Cafe</span>
                  <span>🕐 9h30 - 12h00pm Sat & Sun</span>
                </div>
                <button className={`btn btn-primary ${styles.eventCardBtn}`}>Book Now</button>
              </div>
            </Link>
          </FadeInSection>
          <FadeInSection delay={300} className={styles.eventCardWrapper}>
            <Link href="/events" className={styles.eventCard}>
              <div className={styles.eventCardImage}>
                <img src="/gallery/events/friday-braai.jpg" alt="Friday Braai Evening" loading="lazy" decoding="async" />
                <div className={styles.eventOverlay} />
                <div className={styles.eventDate}>
                  <span className={styles.eventDay}>FRI</span>
                  <span className={styles.eventMonth}>EVE</span>
                </div>
              </div>
              <div className={styles.eventCardContent}>
                <h4>Friday Braai Evening</h4>
                <p>Join us for sizzling braai and live music every Friday night</p>
                <div className={styles.eventMeta}>
                  <span>📍 The Boma Cafe</span>
                  <span>🕐 6pm - 10pm</span>
                </div>
                <button className={`btn btn-primary ${styles.eventCardBtn}`}>Book Now</button>
              </div>
            </Link>
          </FadeInSection>
          <FadeInSection delay={400} className={styles.eventCardWrapper}>
            <Link href="/entertainment" className={styles.eventCard}>
              <div className={styles.eventCardImage}>
                <img src="/gallery/events/live-music.jpg" alt="Live Music Night" loading="lazy" decoding="async" />
                <div className={styles.eventOverlay} />
                <div className={styles.eventDate}>
                  <span className={styles.eventDay}>SAT</span>
                  <span className={styles.eventMonth}>NIGHT</span>
                </div>
              </div>
              <div className={styles.eventCardContent}>
                <h4>Live Music Nights</h4>
                <p>Enjoy soulful live performances every Saturday night</p>
                <div className={styles.eventMeta}>
                  <span>📍 The Boma Cafe</span>
                  <span>🕐 7pm - 11pm</span>
                </div>
                <button className={`btn btn-primary ${styles.eventCardBtn}`}>Book Now</button>
              </div>
            </Link>
          </FadeInSection>
        </div>

        <FadeInSection className={styles.sectionCta}>
          <Link href="/events" className="btn btn-primary">View All Events</Link>
        </FadeInSection>
      </div>
    </section>
  );
}
