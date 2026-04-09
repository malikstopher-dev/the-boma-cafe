'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';

export default function EventsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setSettings(dataService.getSettings());
    setEvents(dataService.getEvents());
  }, []);

  const upcomingEvents = events.filter((e: any) => e.status === 'upcoming');
  const pastEvents = events.filter((e: any) => e.status === 'past');
  const featuredEvent = events.find((e: any) => e.status === 'featured') || upcomingEvents[0];

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
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '6rem 5%',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>Events & Experiences</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            Join us for unforgettable moments and memorable experiences
          </p>
        </section>

        {/* Featured Event */}
        {featuredEvent && (
          <section className="section" style={{ background: 'var(--cream)' }}>
            <div className="container">
              <div className="section-header">
                <h2>Featured Event</h2>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: '3rem',
                maxWidth: '1100px',
                margin: '0 auto',
                background: 'var(--white)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}>
                <div style={{
                  position: 'relative',
                  minHeight: '400px',
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
                          width: index === currentSlide ? '24px' : '10px',
                          height: '10px',
                          borderRadius: '5px',
                          border: 'none',
                          background: index === currentSlide ? 'var(--warm)' : 'rgba(255,255,255,0.5)',
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
                    background: 'var(--gold)',
                    color: 'var(--dark)',
                    padding: '0.35rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    width: 'fit-content',
                    marginBottom: '1rem'
                  }}>
                    ★ FEATURED
                  </span>
                  <h2 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '1rem' }}>
                    {featuredEvent.title}
                  </h2>
                  <p style={{ color: 'var(--text)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    {featuredEvent.description}
                  </p>
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', color: 'var(--text-light)' }}>
                      <span>📅 {new Date(featuredEvent.date).toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', color: 'var(--text-light)' }}>
                      <span>🕐 {featuredEvent.time}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-light)' }}>
                      <span>📍 {featuredEvent.location}</span>
                    </div>
                  </div>
                  <a href={featuredEvent.ctaLink || '/contact'} className="btn btn-primary" style={{ width: 'fit-content' }}>
                    Book Now
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div className="section-header">
              <h2>Upcoming Events</h2>
              <p>Mark your calendar</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
              {upcomingEvents.map((event: any) => (
                <div key={event.id} style={{
                  background: 'var(--cream)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'transform 0.3s ease'
                }}>
                  <div style={{
                    height: '180px',
                    background: event.coverImage 
                      ? `url(${event.coverImage}) center/cover` 
                      : 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)'
                  }} />
                  <div style={{ padding: '1.5rem' }}>
                    <div style={{
                      background: 'var(--primary)',
                      color: 'var(--white)',
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      width: 'fit-content',
                      marginBottom: '1rem'
                    }}>
                      {new Date(event.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </div>
                    <h3 style={{ fontSize: '1.3rem', color: 'var(--dark-brown)', marginBottom: '0.75rem' }}>
                      {event.title}
                    </h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>🕐 {event.time}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>📍 {event.location}</span>
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

        {/* CTA */}
        <section className="section" style={{ background: 'var(--dark-brown)', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '1rem' }}>Host Your Event With Us</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem' }}>From corporate functions to private celebrations, we make it memorable</p>
            <a href="/contact" className="btn btn-primary">Plan Your Event</a>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}