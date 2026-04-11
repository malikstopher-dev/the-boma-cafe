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

        {/* About Section - Premium Design */}
        <section className="section" style={{ background: 'var(--white)', paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '5rem',
              alignItems: 'center',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <div style={{ paddingRight: '1rem' }}>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--dark-brown)',
                  marginBottom: '1.25rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  Welcome to The Boma Cafe
                </div>
                <h3 style={{ fontSize: '2.5rem', color: 'var(--dark-brown)', marginBottom: '1.75rem', lineHeight: 1.25, fontFamily: 'var(--font-display)' }}>
                  {siteSettings?.about?.introTitle || 'Authentic Rustic Charm'}
                </h3>
                <p style={{ color: 'var(--text)', marginBottom: '1.25rem', lineHeight: 1.85, fontSize: '1.05rem' }}>
                  {siteSettings?.about?.introDescription || 'Escape the city hustle and step into a world of rustic charm at The Boma Cafe. Nestled in the heart of Sandton, our open-air restaurant is a hidden gem that will transport you to a different world.'}
                </p>
                <p style={{ color: 'var(--text)', marginBottom: '2.5rem', lineHeight: 1.85, fontSize: '1.05rem' }}>
                  {siteSettings?.about?.fullDescription || 'Experience the perfect blend of rustic elegance and modern sophistication, designed to transport you away from the chaos of everyday life.'}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '2rem' }}>
                  {[
                    { icon: '🔥', title: 'Cozy Firepits', desc: 'Warm glow for romantic evenings' },
                    { icon: '🌿', title: 'Lush Greenery', desc: 'Surrounded by nature' },
                    { icon: '🏠', title: 'Thatched Roof', desc: 'Authentic African architecture' }
                  ].map((feature, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.35rem',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(139, 69, 19, 0.2)'
                      }}>
                        {feature.icon}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--dark-brown)', display: 'block', fontSize: '1.05rem' }}>{feature.title}</strong>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{feature.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Link href="/about" style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}>
                  Learn more about us <span style={{ fontSize: '1.1rem' }}>→</span>
                </Link>
              </div>
              
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '-20px',
                  right: '20px',
                  bottom: '20px',
                  background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
                  borderRadius: '20px',
                  opacity: 0.4
                }} />
                <img 
                  src={siteSettings?.about?.heroImage || '/images/about.jpg'} 
                  alt="Boma Cafe Interior"
                  style={{
                    width: '100%',
                    height: '480px',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    boxShadow: '30px 30px 0 var(--warm)',
                    position: 'relative',
                    zIndex: 1
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Welcome Banner - Premium Design */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '5rem 5%',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(244, 164, 96, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(244, 164, 96, 0.08) 0%, transparent 50%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600 }}>
              {homepage.welcomeTitle || 'More than just a place to eat'}
            </h2>
            <div style={{
              width: '80px',
              height: '3px',
              background: 'linear-gradient(90deg, var(--warm), var(--primary))',
              borderRadius: '2px',
              margin: '0 auto 1.25rem'
            }} />
            <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: 'var(--warm)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
              {homepage.welcomeDescription || 'The Boma Cafe is a place to experience!'}
            </p>
          </div>
        </section>

{/* Featured Menu Section - Premium Design */}
        <section className="section" style={{ background: 'var(--cream)', paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
          <div className="container">
            <div className="section-header">
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--dark-brown)',
                marginBottom: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                Chef's Recommendations
              </div>
              <h2 style={{ marginTop: '0.5rem' }}>{homepage.featuredSectionTitle || 'Signature Dishes'}</h2>
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
                <Link href="/menu" className="card" style={{ padding: 0, textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    height: '220px',
                    background: item.image ? `url(${item.image}) center/cover` : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 50%, rgba(26, 15, 10, 0.6) 100%)'
                    }} />
                    {item.isOnPromo && item.promoBadge && (
                      <span style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
                        background: 'var(--fire-orange)',
                        color: 'var(--white)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        {item.promoBadge}
                      </span>
                    )}
                    {item.isFeatured && (
                      <span style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: 'var(--gold)',
                        color: 'var(--dark)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                        ★ Featured
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.15rem', color: 'var(--dark-brown)', marginBottom: '0.5rem', fontWeight: 600 }}>{item.name}</h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-light)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--cream-dark)', paddingTop: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--primary)' }}>R{item.price}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--warm)', fontWeight: 600 }}>View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
              <Link href="/menu" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>View Full Menu</Link>
            </div>
          </div>
        </section>

{/* Events Section - Premium Design */}
        <section className="section" style={{ background: 'var(--white)', paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
          <div className="container">
            <div className="section-header">
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                padding: '0.4rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--white)',
                marginBottom: '0.75rem',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                What's Happening
              </div>
              <h2 style={{ marginTop: '0.5rem' }}>Upcoming Events</h2>
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
                <Link href="/events" className="card" style={{ padding: 0, textDecoration: 'none', display: 'block' }}>
                  <div style={{
                    height: '200px',
                    background: event.coverImage ? `url(${event.coverImage}) center/cover` : 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, transparent 40%, rgba(26, 15, 10, 0.7) 100%)'
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '1rem',
                      left: '1rem',
                      right: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
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
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>{new Date(event.date).toLocaleDateString('en-ZA', { month: 'short' })}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '1.75rem' }}>
                    <h4 style={{ fontSize: '1.25rem', color: 'var(--dark-brown)', marginBottom: '0.75rem', fontWeight: 600 }}>{event.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5 }}>
                      {event.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-light)', borderTop: '1px solid var(--cream-dark)', paddingTop: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>📍 {event.location}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>🕐 {event.time}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
              <Link href="/events" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>View All Events</Link>
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

{/* Testimonials Section - Premium Design */}
        <section className="section" style={{ background: 'var(--cream)', paddingTop: 'var(--space-4xl)', paddingBottom: 'var(--space-4xl)' }}>
          <div className="container">
            <div className="section-header">
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
                Guest Reviews
              </div>
              <h2 style={{ marginTop: '0.5rem' }}>What Our Guests Say</h2>
              <p>Hear from our satisfied customers</p>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              maxWidth: '1100px',
              margin: '0 auto'
            }}>
              {[
                { text: "Absolutely stunning venue! The rustic atmosphere with the thatched roof and firepits creates the perfect escape from city life. The food is incredible and the service is top-notch.", author: "Sarah M.", location: "Johannesburg" },
                { text: "We've been coming here for years and it never disappoints. The Boma Breakfast is a must-try, and the outdoor seating area is perfect for families. Love the live music on weekends!", author: "David K.", location: "Sandton" },
                { text: "Best hidden gem in Sandton! The curry bunny chow is authentic and delicious. Staff are friendly and welcoming. Perfect for both date nights and family dinners.", author: "Priya S.", location: "Fourways" }
              ].map((testimonial: any, idx: number) => (
                <div style={{
                  background: 'var(--white)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  boxShadow: 'var(--shadow-md)',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '24px',
                    background: 'var(--warm)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem'
                  }}>
                    &ldquo;
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', marginTop: '0.5rem', color: 'var(--gold)' }}>
                    {[...Array(5)].map((_, i) => (
                      <span key={i} style={{ fontSize: '0.9rem' }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: '1rem', color: 'var(--text)', fontStyle: 'italic', marginBottom: '1.75rem', lineHeight: 1.7 }}>
                    {testimonial.text}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--cream)', paddingTop: '1rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--white)',
                      fontWeight: 600,
                      fontSize: '1rem'
                    }}>
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <strong style={{ color: 'var(--dark-brown)', fontSize: '1rem' }}>{testimonial.author}</strong>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-light)' }}>{testimonial.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section - Premium Design */}
        <section style={{ 
          background: 'url(/images/cta-bg.jpg) center/cover fixed',
          position: 'relative',
          padding: 'var(--space-4xl) 5%'
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(26, 15, 10, 0.88) 0%, rgba(44, 24, 16, 0.75) 100%)' }} />
          <div className="container" style={{ position: 'relative', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'inline-block',
              background: 'var(--warm)',
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1.5rem',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              Reservations
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', color: 'var(--white)', marginBottom: '1.25rem', fontWeight: 600 }}>
              Ready to Experience The Boma?
            </h2>
            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: 'var(--cream)', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.7 }}>
              Book your table or reserve your event space today. We can&apos;t wait to welcome you!
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/contact" className="btn btn-primary" style={{ padding: '1rem 2.5rem' }}>Book a Table</Link>
              <Link href="/events" className="btn btn-ghost" style={{ padding: '1rem 2.5rem' }}>Plan an Event</Link>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '3rem', 
              marginTop: '3.5rem',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(255,255,255,0.15)',
              flexWrap: 'wrap'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--warm)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>📞</div>
                <div style={{ color: 'var(--cream)', fontWeight: 600 }}>Call Us</div>
                <a href="tel:0729962212" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>072 996 2212</a>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--warm)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>✉️</div>
                <div style={{ color: 'var(--cream)', fontWeight: 600 }}>Email</div>
                <a href="mailto:info@thebomacafe.co.za" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>info@thebomacafe.co.za</a>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--warm)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>📍</div>
                <div style={{ color: 'var(--cream)', fontWeight: 600 }}>Location</div>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>Sandton, Johannesburg</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer settings={settings} branding={branding} />
    </>
  );
}