'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PremiumHero from '@/components/ui/PremiumHero';
import Slideshow from '@/components/ui/Slideshow';
import { getEventEnquiryLink, getReservationLink } from '@/data/businessInfo';

const featuredEvents = [
  {
    title: 'Weekend Breakfast Buffet',
    description: 'Saturday & Sunday — 9:30 AM to 12:30 PM. Fresh spreads, hot dishes, and relaxed weekend vibes.',
    price: 'R89 Adults · R45 Kids',
    image: '/gallery/events/images (12).jpg',
    cta: 'Book via WhatsApp',
    ctaLink: ''
  },
  {
    title: 'Live Music Nights',
    description: 'Friday & Saturday evenings — resident DJs and live entertainment. Check schedule for upcoming acts.',
    price: 'Free Entry',
    image: '/gallery/events/events-slideshow/slide/eventslide3.jpeg',
    cta: 'View Events',
    ctaLink: ''
  },
  {
    title: 'Venue Hire',
    description: 'Birthdays, corporate events, private celebrations. Our outdoor venue accommodates groups of all sizes.',
    price: 'Enquire for pricing',
    image: '/gallery/venue/2025-04-14.webp',
    cta: 'Enquire Now',
    ctaLink: ''
  }
];

const upcomingEvents = [
  {
    title: "Mother's Day Sip & Paint",
    date: "2026-05-10",
    time: "All Day",
    image: "/gallery/events/events-slideshow/slide/eventslide1.jpeg",
    description: "Old school classics with Dawnay live."
  },
  {
    title: "Saturday with Dawnay",
    date: "2026-05-02",
    time: "12:00",
    image: "/gallery/events/events-slideshow/slide/eventslide2.jpeg",
    description: "Saturday session with Dawnay."
  },
  {
    title: "Friday Groove Garden",
    date: "2026-05-01",
    time: "17:00",
    image: "/gallery/events/events-slideshow/slide/eventslide3.jpeg",
    description: "DJ Shadzo, Prezo & DJ K Smackz live."
  },
  {
    title: "Saturday Groove Garden",
    date: "2026-05-02",
    time: "12:00",
    image: "/gallery/events/events-slideshow/slide/eventslide4.jpeg",
    description: "Featuring DJ Mauzah."
  },
  {
    title: "Jazzy Sunday",
    type: "Recurring",
    time: "All Day",
    image: "/gallery/events/events-slideshow/slide/eventslide5.jpeg",
    description: "Relax with smooth jazz and premium vibes."
  },
  {
    title: "Intimate Comedy Night",
    date: "2026-04-30",
    time: "19:30",
    image: "/gallery/events/events-slideshow/slide/eventslide6.jpeg",
    description: "Stand-up comedy + DJ Dazz on decks."
  }
];

const eventGalleryImages = [
  '/gallery/events/2025-04-23.webp',
  '/gallery/venue/2025-04-14.webp',
  '/gallery/venue/2025-05-09.webp',
  '/gallery/events/2024-09-15.webp'
];

function EventCard({ event }: { event: any }) {
  const [imgError, setImgError] = useState(false);
  
  const getDay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.getDate().toString();
  };
  
  const getMonth = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase();
  };
  
  const formatDays = (days: string[]) => {
    if (!days || days.length === 0) return '';
    return days.map(d => d.substring(0, 3).toUpperCase()).join(' & ');
  };

  const getWhatsAppLink = () => {
    const eventName = event.title;
    const eventDate = event.date ? new Date(event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : (event.days ? event.days.join(' & ') : 'TBA');
    const eventTime = event.time || 'TBA';
    const message = `Hi The Boma Café, I would like to book for ${eventName} on ${eventDate} at ${eventTime}. Please confirm availability.`;
    return `https://wa.me/27715921190?text=${encodeURIComponent(message)}`;
  };

  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(26, 15, 10, 0.06), 0 1px 3px rgba(26, 15, 10, 0.04)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(232, 213, 196, 0.5)',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-12px)';
      e.currentTarget.style.boxShadow = '0 30px 60px rgba(26, 15, 10, 0.12), 0 15px 30px rgba(26, 15, 10, 0.08)';
      e.currentTarget.style.borderColor = 'transparent';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(26, 15, 10, 0.06), 0 1px 3px rgba(26, 15, 10, 0.04)';
      e.currentTarget.style.borderColor = 'rgba(232, 213, 196, 0.5)';
    }}
    >
      <div style={{ position: 'relative', height: '200px', overflow: 'hidden', flexShrink: 0 }}>
        {!imgError ? (
          <img 
            src={event.image} 
            alt={event.title}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: 'linear-gradient(135deg, var(--beige) 0%, var(--beige-light) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem'
          }}>
            🎉
          </div>
        )}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(26, 15, 10, 0.65) 0%, rgba(26, 15, 10, 0.2) 40%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        {event.date ? (
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '18px',
            background: 'linear-gradient(135deg, var(--fire-orange), #c4520a)',
            padding: '0.7rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(232, 137, 46, 0.4)',
            zIndex: 2
          }}>
            <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1 }}>
              {getDay(event.date)}
            </span>
            <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '3px' }}>
              {getMonth(event.date)}
            </span>
          </div>
        ) : event.days ? (
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '18px',
            background: 'linear-gradient(135deg, var(--fire-orange), #c4520a)',
            padding: '0.7rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(232, 137, 46, 0.4)',
            zIndex: 2
          }}>
            <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: 'var(--white)', lineHeight: 1.2 }}>
              {formatDays(event.days)}
            </span>
          </div>
        ) : null}
        {event.type === 'Recurring' && (
          <div style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'var(--gold)',
            color: 'var(--dark)',
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            zIndex: 2,
            letterSpacing: '0.5px'
          }}>
            Recurring
          </div>
        )}
      </div>
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--dark-brown)', fontWeight: 600 }}>
          {event.title}
        </h4>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6, flex: 1 }}>
          {event.description}
        </p>
        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          <span>🕐 {event.time}</span>
        </div>
        <a 
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            width: '100%',
            marginTop: 'auto',
            padding: '0.85rem 1.5rem',
            fontSize: '0.9rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontWeight: 600,
            textDecoration: 'none',
            textAlign: 'center',
            transition: 'all 0.3s ease'
          }}
        >
          Book Now
        </a>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [visibleEvents, setVisibleEvents] = useState<any[]>([]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const filtered = upcomingEvents.filter(event => {
      if (!event.date) return true;
      return new Date(event.date) >= today;
    });
    
    setVisibleEvents(filtered);
  }, []);

  const reservationLink = getReservationLink();
  const eventEnquiryLink = getEventEnquiryLink();

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        <PremiumHero
          imageUrl="/hero/hero-events.jpg"
          badge="Celebrate"
          title="Events & Venue Hire"
          subtitle="Live music, private celebrations, firepit evenings, and unforgettable gatherings in Sandton."
        />
        
        {/* Featured Event Cards */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
              gap: '1.5rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {featuredEvents.map((event, idx) => (
                <div key={idx} style={{
                  background: 'var(--white)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(26, 15, 10, 0.08)'
                }}>
                  <div style={{ height: '180px', overflow: 'hidden' }}>
                    <img 
                      src={event.image} 
                      alt={event.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '0.75rem', fontWeight: 600 }}>
                      {event.title}
                    </h3>
                    <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem' }}>{event.price}</span>
                      {event.title === 'Weekend Breakfast Buffet' ? (
                        <a 
                          href={reservationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.6rem 1.25rem',
                            background: 'var(--primary)',
                            color: 'var(--white)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          {event.cta}
                        </a>
                      ) : event.title === 'Venue Hire' ? (
                        <a 
                          href={eventEnquiryLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.6rem 1.25rem',
                            background: 'var(--primary)',
                            color: 'var(--white)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          {event.cta}
                        </a>
                      ) : (
                        <Link 
                          href="/events"
                          style={{
                            padding: '0.6rem 1.25rem',
                            background: 'var(--primary)',
                            color: 'var(--white)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            textDecoration: 'none'
                          }}
                        >
                          {event.cta}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Venue Slideshow */}
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 5%' }}>
          <Slideshow
             images={[
               { src: '/gallery/venue/134-2000x1125.jpeg', alt: 'Boma Café venue' },
               { src: '/gallery/venue/2023-09-10.webp', alt: 'Boma Café venue view' },
               { src: '/gallery/venue/2023-09-27.webp', alt: 'Boma Café venue space' },
               { src: '/gallery/venue/2023-10-30 (1).webp', alt: 'Boma Café venue area' },
               { src: '/gallery/venue/2023-10-30 (2).webp', alt: 'Boma Café venue interior' },
               { src: '/gallery/venue/2023-10-30.webp', alt: 'Boma Café venue layout' },
               { src: '/gallery/venue/2025-04-14.webp', alt: 'Boma Café venue' },
               { src: '/gallery/venue/2025-04-23.jpg', alt: 'Boma Café venue view' },
             ]}
             autoPlayInterval={6000}
           />
        </div>
        
        {/* SEO Content */}
        <div style={{ 
          background: 'var(--cream)', 
          padding: '1.5rem 5%', 
          textAlign: 'center',
          borderBottom: '1px solid var(--cream-dark)'
        }}>
          <p style={{ 
            fontSize: '0.9rem', 
            color: 'var(--text-light)',
            maxWidth: '800px',
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            <strong style={{ color: 'var(--dark-brown)' }}>Live music in Paulshof</strong> • <strong style={{ color: 'var(--dark-brown)' }}>Weekend buffet Sandton</strong> • <strong style={{ color: 'var(--dark-brown)' }}>Venue hire Johannesburg</strong> • <strong style={{ color: 'var(--dark-brown)' }}>Restaurant events Sandton</strong>
          </p>
        </div>

        {/* Single Upcoming Events Section */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--white)',
                marginBottom: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Coming Up
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>Upcoming Events</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {visibleEvents.map((event: any, idx: number) => (
                <EventCard key={idx} event={event} />
              ))}
            </div>
            {visibleEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>No scheduled public events right now.</p>
                <p>Contact us for private venue hire.</p>
              </div>
            )}
          </div>
        </section>

        {/* Venue Hire Details */}
        <section style={{ background: 'var(--beige)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
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
              Private Events
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>Celebrate at The Boma</h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
              {['Birthdays', 'Corporate Events', 'Family Celebrations', 'Private Gatherings'].map((item, idx) => (
                <div key={idx} style={{
                  background: 'var(--cream)',
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.9rem',
                  color: 'var(--dark-brown)'
                }}>
                  {item}
                </div>
              ))}
            </div>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem', maxWidth: '550px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
              Our outdoor venue with thatched roof and firepits creates the perfect atmosphere for celebrations of all sizes.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <a href={eventEnquiryLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
                Plan Your Event
              </a>
              <a href={eventEnquiryLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '1rem 2.5rem' }}>
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>

        {/* Event Gallery Teaser */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-2xl) 5%' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
              <h3 style={{ fontSize: 'clamp(1.25rem, 3vw, 1.75rem)', color: 'var(--dark-brown)', fontFamily: 'var(--font-display)' }}>
                Moments from past events
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', maxWidth: '1000px', margin: '0 auto' }}>
              {eventGalleryImages.map((img, idx) => (
                <div key={idx} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={img} alt={`Event moment ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
              <Link href="/gallery" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                View Full Gallery →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--dark-brown)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Ready to book or enquire?
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="tel:0715921190" className="btn btn-primary" style={{ padding: '1rem 2rem' }}>
                Call Us
              </a>
              <a href={eventEnquiryLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '1rem 2rem' }}>
                WhatsApp Us
              </a>
              <Link href="/gallery" className="btn btn-ghost" style={{ padding: '1rem 2rem' }}>
                View Gallery
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}