'use client';

import Link from 'next/link';
import Image from 'next/image';
import FadeInSection from '@/components/ui/FadeInSection';
import Slideshow from '@/components/ui/Slideshow';
import { resolveImage } from '@/lib/resolve-image';
import styles from '@/app/page.module.css';

interface EventCard {
  id: string;
  title: string;
  date?: string;
  time?: string;
  description: string;
  image?: string;
  coverImage?: string;
  location?: string;
  ctaLabel?: string;
  ctaLink?: string;
}

interface UpcomingEventsSectionProps {
  events?: EventCard[];
  slideshowImages?: { src: string; alt: string }[];
}

export default function UpcomingEventsSection({ events = [], slideshowImages = [] }: UpcomingEventsSectionProps) {
  const hasContent = events.length > 0 || slideshowImages.length > 0;

  if (!hasContent) {
    return null;
  }

  const displayImages = slideshowImages.length > 0
    ? slideshowImages
    : events
        .filter(e => e.coverImage || e.image)
        .map(e => ({ src: resolveImage(e.coverImage || e.image) || e.coverImage || e.image!, alt: e.title }));

  return (
    <section className={styles.eventsSection}>
      <div className="container">
        <FadeInSection className={styles.sectionHeader}>
          <span className="section-badge primary">What&apos;s Happening</span>
          <h2>Upcoming Events</h2>
          <p>Join us for memorable experiences</p>
        </FadeInSection>

        {displayImages.length > 0 && (
          <FadeInSection className={styles.eventSlideshowWrapper}>
            <Slideshow images={displayImages} autoPlayInterval={5000} aspectRatio="16/9" />
          </FadeInSection>
        )}

        {events.length > 0 && (
          <div className={styles.eventsGrid}>
            {events.map((event, index) => (
              <FadeInSection key={event.id} delay={200 + index * 100} className={styles.eventCardWrapper}>
                <Link href={event.ctaLink || '/experience'} className={styles.eventCard}>
                  <div className={styles.eventCardImage}>
                    <Image
                      src={resolveImage(event.coverImage || event.image) || event.coverImage || event.image || '/gallery/weekend-buffet.jpg'}
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover' }}
                      loading="lazy"
                    />
                    <div className={styles.eventOverlay} />
                    {event.date && (
                      <div className={styles.eventDate}>
                        <span className={styles.eventDay}>{event.date}</span>
                        {event.time && <span className={styles.eventMonth}>{event.time}</span>}
                      </div>
                    )}
                  </div>
                  <div className={styles.eventCardContent}>
                    <h4>{event.title}</h4>
                    <p>{event.description}</p>
                    {event.location && (
                      <div className={styles.eventMeta}>
                        <span>{event.location}</span>
                      </div>
                    )}
                    <button className={`btn btn-primary ${styles.eventCardBtn}`}>
                      {event.ctaLabel || 'Book Now'}
                    </button>
                  </div>
                </Link>
              </FadeInSection>
            ))}
          </div>
        )}

        <FadeInSection className={styles.sectionCta}>
          <Link href="/experience" className="btn btn-primary">View All Events</Link>
        </FadeInSection>
      </div>
    </section>
  );
}
