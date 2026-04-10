'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnnouncementBar from '@/components/ui/AnnouncementBar';
import PopupModal from '@/components/ui/PopupModal';
import { cmsService } from '@/lib/client-cms';

const heroSlides = [
  {
    image: '/hero/slide1.jpg',
    subtitle: 'Welcome to',
    title: 'The Boma Cafe',
    tagline: 'Where the Rustic Meets the Soulful!',
    cta: 'Book a Table',
    ctaLink: '/contact'
  },
  {
    image: '/hero/slide2.jpg',
    subtitle: 'Escape the City',
    title: 'Rustic',
    titleAccent: 'Ambiance',
    tagline: 'Savor your meal beneath a thatched roof',
    cta: 'Discover More',
    ctaLink: '/about'
  },
  {
    image: '/hero/slide3.jpg',
    subtitle: 'More Than Just a Cafe',
    title: 'An',
    titleAccent: 'Experience',
    tagline: 'Where nature meets the warmth of home',
    cta: 'View Events',
    ctaLink: '/events'
  }
];

export default function Home() {
  const [settings, setSettings] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [popup, setPopup] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSettings, ann, pop, items, evts, promos] = await Promise.all([
          cmsService.getAllSettings(),
          cmsService.getAnnouncement(),
          cmsService.getPopup(),
          cmsService.getMenuItems(),
          cmsService.getEvents(),
          cmsService.getPromotions()
        ]);
        setSiteSettings(allSettings);
        setSettings(allSettings);
        setAnnouncement(ann);
        setPopup(pop);
        setMenuItems(items);
        setEvents(evts);
        setPromotions(promos);
      } catch (error) {
        console.error('Error loading CMS data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(slideTimer);
  }, []);

  const featuredMenuItems = menuItems.filter((item: any) => item.isFeatured && !item.isOutOfStock).slice(0, 4);
  const upcomingEvents = events.filter((event: any) => event.status === 'upcoming' && event.showOnHomepage).slice(0, 3);
  const activePromotions = promotions.filter((promo: any) => promo.isActive && promo.displayOnHomepage).slice(0, 2);

  const homepage = siteSettings?.homepage || {};
  const promoBar = siteSettings?.promoBar || {};
  const branding = siteSettings?.branding || {};

  return (
    <>
      {promoBar.isEnabled && promoBar.message && (
        <AnnouncementBar 
          text={promoBar.message} 
          link={promoBar.buttonLink} 
          linkText={promoBar.buttonText}
        />
      )}
      <Header />
      <PopupModal popup={popup} />

      <main>
        {/* Hero Slider - Mobile Responsive */}
        <section className="hero-section">
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
            >
              <div className="hero-slide-bg" style={{ backgroundImage: `url(${slide.image})` }} />
            </div>
          ))}
          <div className="hero-overlay" />
          
          <div className="hero-content">
            <p className="hero-subtitle">{heroSlides[currentSlide].subtitle}</p>
            <h1 className="hero-title">
              {heroSlides[currentSlide].title}
              {heroSlides[currentSlide].titleAccent && <span className="hero-accent">{heroSlides[currentSlide].titleAccent}</span>}
            </h1>
            <p className="hero-tagline">{heroSlides[currentSlide].tagline}</p>
            <div className="hero-cta">
              <Link href={heroSlides[currentSlide].ctaLink} className="btn btn-primary">View Details</Link>
              <Link href="/menu" className="btn btn-ghost">View Menu</Link>
            </div>
          </div>

          {/* Hero Dots */}
          <div className="hero-dots">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`hero-dot ${index === currentSlide ? 'active' : ''}`}
              />
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4rem',
              alignItems: 'center',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <div>
                <h3 style={{ fontSize: '2.25rem', color: 'var(--dark-brown)', marginBottom: '1.5rem', lineHeight: 1.3 }}>
                  {siteSettings?.about?.introTitle || 'Authentic Rustic Charm'}
                </h3>
                <p style={{ color: 'var(--text)', marginBottom: '1rem', lineHeight: 1.8 }}>
                  {siteSettings?.about?.introDescription || 'Experience the perfect blend of rustic elegance and modern sophistication, designed to transport you away from the chaos of everyday life.'}
                </p>
                <p style={{ color: 'var(--text)', marginBottom: '2rem', lineHeight: 1.8 }}>
                  {siteSettings?.about?.fullDescription || 'Escape the city hustle and step into a world of rustic charm at The Boma Cafe. Nestled in the heart of Sandton, our open-air restaurant is a hidden gem that will transport you to a different world.'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
                  {[
                    { icon: '🔥', title: 'Cozy Firepits', desc: 'Warm glow for romantic evenings' },
                    { icon: '🌿', title: 'Lush Greenery', desc: 'Surrounded by nature' },
                    { icon: '🏠', title: 'Thatched Roof', desc: 'Authentic African architecture' }
                  ].map((feature, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '50px',
                        height: '50px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        {feature.icon}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block' }}>{feature.title}</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{feature.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{ position: 'relative' }}>
                <img 
                  src={siteSettings?.about?.heroImage || '/images/about.jpg'} 
                  alt="Boma Cafe Interior"
                  style={{
                    width: '100%',
                    height: '450px',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    boxShadow: '25px 25px 0 var(--warm)'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Welcome Banner */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '5rem 5%',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--white)', marginBottom: '1rem' }}>
            {homepage.welcomeTitle || 'More than just a place to eat'}
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--warm)', fontStyle: 'italic' }}>
            {homepage.welcomeDescription || 'The Boma Cafe is a place to experience!'}
          </p>
        </section>

        {/* Featured Menu Section */}
        <section className="section" style={{ background: 'var(--cream)' }}>
          <div className="container">
            <div className="section-header">
              <h2>{homepage.featuredSectionTitle || 'Signature Dishes'}</h2>
              <p>{homepage.featuredSectionSubtitle || "Explore our chef's recommended selections"}</p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {featuredMenuItems.map((item: any) => (
                <div key={item.id} className="card" style={{ padding: 0 }}>
                  <div style={{
                    height: '200px',
                    background: item.image ? `url(${item.image}) center/cover` : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    position: 'relative'
                  }}>
                    {item.isOnPromo && item.promoBadge && (
                      <span style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
                        background: 'var(--fire-orange)',
                        color: 'var(--white)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {item.promoBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.2rem', color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>{item.name}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--primary)' }}>R{item.price}</span>
                      <Link href="/menu" style={{ fontSize: '0.85rem', color: 'var(--warm)', fontWeight: 600 }}>View Details →</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <Link href="/menu" className="btn btn-primary">View Full Menu</Link>
            </div>
          </div>
        </section>

        {/* Events Section */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div className="section-header">
              <h2>Upcoming Events</h2>
              <p>Join us for memorable experiences</p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {upcomingEvents.map((event: any) => (
                <div key={event.id} className="card">
                  <div style={{
                    height: '180px',
                    background: event.coverImage ? `url(${event.coverImage}) center/cover` : 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      background: 'var(--primary)',
                      color: 'var(--white)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem'
                    }}>
                      {new Date(event.date).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.3rem', color: 'var(--dark-brown)', marginBottom: '0.75rem' }}>{event.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      <span>📍</span> {event.location} &nbsp;|&nbsp; <span>🕐</span> {event.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <Link href="/events" className="btn btn-primary">View All Events</Link>
            </div>
          </div>
        </section>

        {/* Promotions Section */}
        {activePromotions.length > 0 && (
          <section className="section" style={{ background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)' }}>
            <div className="container">
              <div className="section-header">
                <h2 style={{ color: 'var(--white)' }}>Special Offers</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Don&apos;t miss out on our current promotions</p>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '2rem',
                maxWidth: '900px',
                margin: '0 auto'
              }}>
                {activePromotions.map((promo: any) => (
                  <div key={promo.id} style={{
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ fontSize: '1.75rem', color: 'var(--warm)', marginBottom: '1rem' }}>{promo.title}</h3>
                    <p style={{ color: 'var(--cream)', marginBottom: '1.5rem', fontSize: '1rem' }}>{promo.description}</p>
                    <Link href={promo.ctaLink} className="btn btn-secondary">{promo.ctaText}</Link>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                <Link href="/promotions" className="btn btn-ghost">View All Promotions</Link>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        <section className="section" style={{ background: 'var(--cream)' }}>
          <div className="container">
            <div className="section-header">
              <h2>What Our Guests Say</h2>
              <p>Hear from our satisfied customers</p>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '2rem',
              maxWidth: '1000px',
              margin: '0 auto',
              overflowX: 'auto',
              paddingBottom: '1rem'
            }}>
              {testimonials.map((testimonial: any) => (
                <div key={testimonial.id} style={{
                  background: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  minWidth: '300px',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', color: 'var(--gold)' }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ fontSize: '1rem' }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '1rem', color: 'var(--text)', fontStyle: 'italic', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div style={{ borderTop: '1px solid var(--cream)', paddingTop: '1rem' }}>
                    <strong style={{ color: 'var(--dark-brown)' }}>{testimonial.author}</strong>
                    {testimonial.location && (
                      <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-light)' }}>{testimonial.location}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section" style={{ 
          background: 'url(/images/cta-bg.jpg) center/cover fixed',
          position: 'relative'
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(26, 15, 10, 0.8)' }} />
          <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--white)', marginBottom: '1rem' }}>Ready to Experience The Boma?</h2>
            <p style={{ fontSize: '1.15rem', color: 'var(--cream)', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
              Book your table or reserve your event space today. We can&apos;t wait to welcome you!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link href="/contact" className="btn btn-primary">Book a Table</Link>
              <Link href="/events" className="btn btn-ghost">Plan an Event</Link>
            </div>
          </div>
        </section>
      </main>

      <Footer settings={settings} branding={branding} />
    </>
  );
}