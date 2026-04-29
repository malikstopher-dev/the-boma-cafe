'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import { defaultEvents, defaultLastWeekHighlight } from '@/lib/cms/defaults';
import PremiumHero from '@/components/ui/PremiumHero';
import Slideshow from '@/components/ui/Slideshow';
import UpcomingEventsSection from '@/components/sections/UpcomingEventsSection';

function GallerySlider({ images, alt }: { images: string[]; alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!images || images.length === 0) {
    return (
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
    );
  }
   
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };
   
  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };
   
  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };
   
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${images[currentIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'background-image 0.4s ease-in-out'
        }}
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            style={{
              position: 'absolute',
              left: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              transition: 'background 0.2s'
            }}
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              transition: 'background 0.2s'
            }}
          >
            ›
          </button>
          <div style={{
            position: 'absolute',
            bottom: '0.75rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '0.5rem'
          }}>
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                style={{
                  width: idx === currentIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: idx === currentIndex ? '4px' : '50%',
                  border: 'none',
                  background: idx === currentIndex ? 'var(--warm)' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function UpcomingEventCard({ event }: { event: any }) {
  const galleryImages = event.galleryImages?.length > 0 
    ? event.galleryImages 
    : event.coverImage || event.image 
      ? [event.coverImage || event.image] 
      : [];
   
  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '20px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    }}
    >
      <div style={{ height: '200px', position: 'relative' }}>
        <GallerySlider images={galleryImages} alt={event.title} />
        {event.category && (
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            background: 'var(--primary)',
            color: 'var(--white)',
            padding: '0.35rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {event.category}
          </div>
        )}
      </div>
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            color: 'var(--white)',
            padding: '0.5rem 0.75rem',
            borderRadius: '10px',
            textAlign: 'center',
            minWidth: '55px'
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, lineHeight: 1 }}>
              {new Date(event.date).getDate()}
            </div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {new Date(event.date).toLocaleDateString('en-ZA', { month: 'short' })}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--dark-brown)', fontWeight: 600, lineHeight: 1.3 }}>
              {event.title}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: '0.25rem' }}>
              {event.time}
            </p>
          </div>
        </div>
        <p style={{ 
          fontSize: '0.9rem', 
          color: 'var(--text)', 
          marginBottom: '1.25rem', 
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {event.description}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <a 
            href={event.ctaLink || '/contact'}
            className="btn btn-primary"
            style={{ 
              padding: '0.65rem 1.25rem', 
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {event.ctaLabel || 'Book'} ↗
          </a>
          <a 
            href="https://wa.me/27729961190"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.65rem 1.25rem',
              background: '#25D366',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function PastEventCard({ event }: { event: any }) {
  const galleryImages = event.galleryImages?.length > 0 
    ? event.galleryImages 
    : event.coverImage || event.image 
      ? [event.coverImage || event.image] 
      : [];
   
  return (
    <div style={{
      background: 'var(--white)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      opacity: 0.85
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.opacity = '1';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.opacity = '0.85';
    }}
    >
      <div style={{ height: '160px', position: 'relative' }}>
        <GallerySlider images={galleryImages} alt={event.title} />
        {event.category && (
          <div style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'rgba(0,0,0,0.6)',
            color: 'white',
            padding: '0.25rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.65rem',
            fontWeight: 500,
            textTransform: 'uppercase'
          }}>
            {event.category}
          </div>
        )}
      </div>
      <div style={{ padding: '1.25rem' }}>
        <h4 style={{ fontSize: '1rem', color: 'var(--dark-brown)', marginBottom: '0.4rem', fontWeight: 600 }}>
          {event.title}
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '0.5rem' }}>
          {new Date(event.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <p style={{ 
          fontSize: '0.8rem', 
          color: 'var(--text)', 
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {event.description}
        </p>
      </div>
    </div>
  );
}

function LastWeekHighlight({ highlight }: { highlight: any }) {
  if (!highlight?.visible) return null;
   
  return (
    <section style={{ 
      background: 'var(--beige)', 
      padding: 'var(--space-3xl) 5%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: highlight.videoSrc
          ? undefined
          : highlight.posterImage
            ? `url(${highlight.posterImage})`
            : 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.4
      }} />
      {highlight.videoSrc && (
        <video
          autoPlay={highlight.autoplay !== false}
          muted={highlight.muted !== false}
          loop={highlight.loop !== false}
          playsInline
          preload="metadata"
          poster={highlight.posterImage}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.5
          }}
        >
          <source src={highlight.videoSrc} type="video/mp4" />
        </video>
      )}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-block',
          background: 'var(--warm)',
          padding: '0.4rem 1rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--dark-brown)',
          marginBottom: '1rem',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Last Week
        </div>
        <h2 style={{ 
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', 
          color: 'var(--white)', 
          marginBottom: '1rem',
          fontFamily: 'var(--font-display)'
        }}>
          {highlight.title || 'Last Week at The Boma Café'}
        </h2>
        <p style={{ 
          color: 'rgba(255,255,255,0.85)', 
          marginBottom: '2rem', 
          maxWidth: '550px', 
          margin: '0 auto 2rem',
          lineHeight: 1.7,
          fontSize: '1.05rem'
        }}>
          {highlight.description || "Missed the action? Here's what went down last week - live music, great food, and good vibes!"}
        </p>
        <a 
          href={highlight.ctaLink || '/contact'}
          className="btn btn-primary"
          style={{ 
            padding: '1rem 2.5rem',
            fontSize: '1rem'
          }}
        >
          {highlight.ctaLabel || 'Book This Weekend'}
        </a>
      </div>
    </section>
  );
}

export default function EventsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [lastWeek, setLastWeek] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSettings, evts, hlw] = await Promise.all([
          cmsService.getAllSettings(),
          cmsService.getEvents(),
          cmsService.getLastWeekHighlight()
        ]);
        setSettings(allSettings);
        setEvents(evts);
        setLastWeek(hlw);
      } catch (error) {
        console.error('Error loading events data:', error);
        setEvents(defaultEvents);
        setLastWeek(defaultLastWeekHighlight);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const upcomingEvents = events.filter((e: any) => e.isUpcoming && e.visible !== false).slice(0, 6);
  const pastEvents = events.filter((e: any) => !e.isUpcoming && e.visible !== false).slice(0, 6);
  const featuredEvent = events.find((e: any) => e.isFeatured && e.visible !== false) || upcomingEvents[0];

  if (isLoading) {
    return (
      <>
        <Header />
        <main style={{ paddingTop: '80px', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎉</div>
            <p style={{ color: 'var(--text-light)' }}>Loading events...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ paddingTop: 0 }}>
        <PremiumHero
          imageUrl="/hero/hero-events.jpg"
          badge="Celebrate"
          title="Events & Venue Hire"
          subtitle="Host unforgettable celebrations at The Boma Café — from live music nights and buffet experiences to private functions and corporate events in Sandton."
        />

        {/* Upcoming Events Section - Replicated from Homepage */}
        <UpcomingEventsSection />

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

        {/* Last Week Highlight */}
        <LastWeekHighlight highlight={lastWeek} />

        {/* Featured Event */}
        {featuredEvent && (
          <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%' }}>
            <div className="container">
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--dark-brown)',
                  marginBottom: '0.75rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  Featured Event
                </div>
                <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>
                  {featuredEvent.title}
                </h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '0',
                maxWidth: '1100px',
                margin: '0 auto',
                background: 'var(--white)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <div style={{
                  position: 'relative',
                  minHeight: '350px',
                  background: '#f5f5f5'
                }}>
                  <GallerySlider 
                    images={
                      featuredEvent.galleryImages?.length > 0 
                        ? featuredEvent.galleryImages 
                        : featuredEvent.coverImage || featuredEvent.image 
                          ? [featuredEvent.coverImage || featuredEvent.image] 
                          : []
                    } 
                    alt={featuredEvent.title} 
                  />
                </div>
                <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  {featuredEvent.category && (
                    <span style={{
                      display: 'inline-block',
                      background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                      color: 'var(--dark)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      width: 'fit-content',
                      marginBottom: '1rem',
                      letterSpacing: '0.5px'
                    }}>
                      {featuredEvent.category}
                    </span>
                  )}
                  <h3 style={{ fontSize: '1.75rem', color: 'var(--dark-brown)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                    {featuredEvent.title}
                  </h3>
                  <p style={{ color: 'var(--text)', marginBottom: '1.5rem', lineHeight: 1.7, fontSize: '1.05rem' }}>
                    {featuredEvent.description}
                  </p>
                  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                      <span style={{ width: '32px', height: '32px', background: 'var(--cream)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📅</span>
                      {new Date(featuredEvent.date).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                      <span style={{ width: '32px', height: '32px', background: 'var(--cream)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🕐</span>
                      {featuredEvent.time}
                    </div>
                    {featuredEvent.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-light)', fontSize: '0.95rem' }}>
                        <span style={{ width: '32px', height: '32px', background: 'var(--cream)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>📍</span>
                        {featuredEvent.location}
                      </div>
                    )}
                  </div>
                  <a href={featuredEvent.ctaLink || '/contact'} className="btn btn-primary" style={{ width: 'fit-content', padding: '1rem 2.5rem' }}>
                    {featuredEvent.ctaLabel || 'Book Now'}
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events */}
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
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>
                Upcoming Events
              </h2>
              <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>Mark your calendar for these unmissable experiences</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {upcomingEvents.map((event: any) => (
                <UpcomingEventCard key={event.id} event={event} />
              ))}
            </div>
            {upcomingEvents.length === 0 && (
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
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>
              Host Your Event With Us
            </h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2.5rem', maxWidth: '550px', margin: '0 auto', lineHeight: 1.6 }}>
              From corporate functions to private celebrations, we make it memorable
            </p>
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
