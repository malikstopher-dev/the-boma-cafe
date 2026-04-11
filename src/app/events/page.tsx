'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import { defaultEvents } from '@/data/defaultData';

export default function EventsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSettings, evts] = await Promise.all([
          cmsService.getAllSettings(),
          cmsService.getEvents()
        ]);
        console.log('Loaded events:', evts.length);
        setSettings(allSettings);
        if (evts.length > 0) setEvents(evts);
      } catch (error) {
        console.error('Error loading events data:', error);
      }
    };
    loadData();
  }, []);

  // Fallback to default data if no CMS data
  useEffect(() => {
    if (events.length === 0) {
      console.log('Using fallback default events');
      setEvents(defaultEvents);
    }
  }, []);

  const upcomingEvents = events.filter((e: any) => e.isUpcoming);
  const pastEvents = events.filter((e: any) => !e.isUpcoming && !e.isFeatured);
  const featuredEvent = events.find((e: any) => e.isFeatured) || upcomingEvents[0];

  const slideshowImages = [
    '/images/livemusic1.jpg',
    '/images/livemusic2.jpg'
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Header />
      <main style={{ paddingTop: '80px' }}>
        {/* Hero - Premium Design */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
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
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              What's Happening
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--white)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
              Events & Experiences
            </h1>
            <p style={{ color: 'var(--cream)', fontSize: 'clamp(1rem, 2vw, 1.15rem)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
              Join us for unforgettable moments and memorable experiences
            </p>
          </div>
        </section>

        {/* Featured Event - Premium Design */}
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
                  Don't Miss Out
                </div>
                <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginTop: '0.5rem' }}>Featured Event</h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
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
                  minHeight: '420px',
                  background: '#f5f5f5'
                }}>
                  {slideshowImages.map((img, index) => (
                    <div
                      key={index}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${img})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: index === currentSlide ? 1 : 0,
                        transition: 'opacity 0.8s ease-in-out'
                      }}
                    />
                  ))}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(26,15,10,0.3) 0%, transparent 30%, transparent 70%, rgba(26,15,10,0.3) 100%)'
                  }} />
                  {/* Previous Arrow */}
                  <button
                    onClick={() => setCurrentSlide(prev => prev > 0 ? prev - 1 : slideshowImages.length - 1)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '1rem',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'white',
                      border: 'none',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      transition: 'all 0.3s ease',
                      zIndex: 2
                    }}
                  >
                    ‹
                  </button>
                  {/* Next Arrow */}
                  <button
                    onClick={() => setCurrentSlide(prev => (prev + 1) % slideshowImages.length)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: '1rem',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: 'white',
                      border: 'none',
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      transition: 'all 0.3s ease',
                      zIndex: 2
                    }}
                  >
                    ›
                  </button>
                  {/* Navigation Dots */}
                  <div style={{
                    position: 'absolute',
                    bottom: '1.5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '0.75rem'
                  }}>
                    {slideshowImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        style={{
                          width: index === currentSlide ? '28px' : '10px',
                          height: '10px',
                          borderRadius: index === currentSlide ? '6px' : '50%',
                          border: 'none',
                          background: index === currentSlide ? 'var(--warm)' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ padding: '3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                    color: 'var(--dark)',
                    padding: '0.4rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    width: 'fit-content',
                    marginBottom: '1.25rem',
                    letterSpacing: '0.5px'
                  }}>
                    ★ FEATURED
                  </span>
                  <h2 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>
                    {featuredEvent.title}
                  </h2>
                  <p style={{ color: 'var(--text)', marginBottom: '1.75rem', lineHeight: 1.7, fontSize: '1.05rem' }}>
                    {featuredEvent.description}
                  </p>
                  <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-light)', fontSize: '1rem' }}>
                      <span style={{ 
                        width: '36px', 
                        height: '36px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}>📅</span> 
                      {new Date(featuredEvent.date).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-light)', fontSize: '1rem' }}>
                      <span style={{ 
                        width: '36px', 
                        height: '36px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}>🕐</span> 
                      {featuredEvent.time}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-light)', fontSize: '1rem' }}>
                      <span style={{ 
                        width: '36px', 
                        height: '36px', 
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}>📍</span> 
                      {featuredEvent.location}
                    </div>
                  </div>
                  <a href={featuredEvent.ctaLink || '/contact'} className="btn btn-primary" style={{ width: 'fit-content', padding: '1rem 2.5rem' }}>
                    Book Now
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events - Premium Design */}
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
              <p style={{ color: 'var(--text-light)', marginTop: '0.5rem' }}>Mark your calendar</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {upcomingEvents.map((event: any) => (
                <div key={event.id} style={{
                  background: 'var(--cream)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}>
                  <div style={{
                    height: '200px',
                    background: event.coverImage 
                      ? `url(${event.coverImage}) center/cover` 
                      : 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 50%, rgba(26, 15, 10, 0.7) 100%)'
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      right: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end'
                    }}>
                      <div style={{
                        background: 'var(--primary)',
                        color: 'var(--white)',
                        padding: '0.6rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        minWidth: '70px'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}>{new Date(event.date).getDate()}</div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>{new Date(event.date).toLocaleDateString('en-ZA', { month: 'short' })}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '1.75rem' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '0.75rem', fontWeight: 600 }}>
                      {event.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cream-dark)', paddingTop: '1rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🕐 {event.time}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>📍 {event.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <section className="section" style={{ background: 'var(--cream)' }}>
            <div className="container">
              <div className="section-header">
                <h2>Past Events</h2>
                <p>Relive the memories</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                {pastEvents.map((event: any) => (
                  <div key={event.id} style={{
                    background: 'var(--white)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)',
                    opacity: 0.8
                  }}>
                    <div style={{ height: '120px', background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)' }} />
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>{event.title}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{new Date(event.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA - Premium Design */}
        <section style={{ background: 'var(--dark-brown)', padding: 'var(--space-3xl) 5%', textAlign: 'center', position: 'relative' }}>
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
            <a href="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>Plan Your Event</a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}