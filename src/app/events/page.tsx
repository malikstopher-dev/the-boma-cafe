'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import PremiumHero from '@/components/ui/PremiumHero';
import Slideshow from '@/components/ui/Slideshow';
import UpcomingEventsSection from '@/components/sections/UpcomingEventsSection';

const events = [
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
  },
  {
    title: "Saturday with Earl B",
    date: "2026-04-25",
    time: "12:00",
    image: "/gallery/events/events-slideshow/slide/eventslide7.jpg",
    description: "Saturday session with Earl B."
  },
  {
    title: "Weekend Buffet Experience",
    type: "Recurring",
    days: ["Saturday", "Sunday"],
    time: "09:30 - 12:00",
    date: null,
    image: "/gallery/events/images (12).jpg",
    description: "Enjoy our signature weekend buffet with great food, music, and atmosphere."
  }
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
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden', flexShrink: 0 }}>
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
      <div style={{ padding: '1.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', color: 'var(--dark-brown)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          {event.title}
        </h4>
        <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.7, flex: 1 }}>
          {event.description}
        </p>
        <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-light)', fontSize: '0.8rem', marginBottom: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--cream)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>🕐 {event.time}</span>
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
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--secondary)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(0)';
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
    
    const filtered = events.filter(event => {
      if (!event.date) return true; // Recurring events
      return new Date(event.date) >= today;
    });
    
    setVisibleEvents(filtered);
  }, []);

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        <PremiumHero
          imageUrl="/hero/hero-events.jpg"
          badge="Celebrate"
          title="Events & Venue Hire"
          subtitle="Host unforgettable celebrations at The Boma Café — from live music nights and buffet experiences to private functions and corporate events in Sandton."
        />
        
        {/* Events Slideshow */}
        <div style={{ 
          maxWidth: '900px', 
          margin: '0 auto', 
          padding: '0 5%' 
        }}>
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
               { src: '/gallery/venue/2025-04-23.webp', alt: 'Boma Café venue space' },
               { src: '/gallery/venue/2025-05-09.webp', alt: 'Boma Café venue area' },
               { src: '/gallery/venue/2025-05-13 (1).webp', alt: 'Boma Café venue interior' },
               { src: '/gallery/venue/2025-05-13.webp', alt: 'Boma Café venue layout' },
               { src: '/gallery/venue/2025-05-19.webp', alt: 'Boma Café venue' },
               { src: '/gallery/venue/2025-07-20.webp', alt: 'Boma Café venue view' },
               { src: '/gallery/venue/2025-11-29.webp', alt: 'Boma Café venue space' },
               { src: '/gallery/venue/2025-12-25.webp', alt: 'Boma Café venue area' },
               { src: '/gallery/venue/586695496_18542032552027334_196345222483858604_n.jpg', alt: 'Boma Café venue interior' },
               { src: '/gallery/venue/587298253_18541742503027334_426466464687217115_n.jpg', alt: 'Boma Café venue layout' },
               { src: '/gallery/venue/bomacafe2_large.jpg', alt: 'Boma Café venue' },
               { src: '/gallery/venue/bomacafe3.jpg', alt: 'Boma Café venue view' },
               { src: '/gallery/venue/bomacafe4-large-1.jpg', alt: 'Boma Café venue space' },
               { src: '/gallery/venue/bomacafe6_large.jpg', alt: 'Boma Café venue area' },
               { src: '/gallery/venue/download.jpg', alt: 'Boma Café venue interior' },
               { src: '/gallery/venue/gallery-3-800x600.jpeg', alt: 'Boma Café venue layout' },
               { src: '/gallery/venue/gallery-5-800x600.jpeg', alt: 'Boma Café venue' },
               { src: '/gallery/venue/gallery-8-800x600.jpeg', alt: 'Boma Café venue view' },
               { src: '/gallery/venue/heroslide-1800x1013.jpeg', alt: 'Boma Café venue space' },
               { src: '/gallery/venue/slide1-1980x1080.jpeg', alt: 'Boma Café venue area' },
               { src: '/gallery/venue/slide3-1800x982.jpeg', alt: 'Boma Café venue interior' },
               { src: '/gallery/venue/unnamed (1).webp', alt: 'Boma Café venue layout' },
               { src: '/gallery/venue/unnamed (2).webp', alt: 'Boma Café venue' },
               { src: '/gallery/venue/unnamed (3).webp', alt: 'Boma Café venue view' },
               { src: '/gallery/venue/unnamed.webp', alt: 'Boma Café venue space' },
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
        
        {/* Upcoming Events Section from Homepage */}
        <UpcomingEventsSection />
        
        {/* Events Page Specific Upcoming Events */}
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
                Calendar
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>Upcoming Events</h2>
              <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>Mark your calendar for these unmissable experiences</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {visibleEvents.map((event: any, idx: number) => (
                <EventCard key={idx} event={event} />
              ))}
            </div>
            {visibleEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-light)' }}>
                <p>No upcoming events scheduled. Check back soon!</p>
              </div>
            )}
          </div>
        </section>
        
        {/* Venue Hire CTA */}
        <section style={{ 
          background: 'var(--beige)', 
          padding: 'var(--space-3xl) 5%', 
          textAlign: 'center',
          position: 'relative'
        }}>
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
              Private Events
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>Host Your Event With Us</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>From corporate functions to private celebrations, we make it memorable</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              <a href="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>
                Plan Your Event
              </a>
              <a 
                href="https://wa.me/27729961190"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '1rem 2.5rem',
                  background: 'transparent',
                  border: '2px solid var(--warm)',
                  color: 'var(--warm)',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
