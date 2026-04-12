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

  const showcaseCategories = [
    { title: 'Breakfast', desc: 'Start your day right', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=450&fit=crop', link: '/menu?category=Breakfast', badge: 'Popular' },
    { title: 'Wood-Fired Pizza', desc: 'Handcrafted perfection', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=450&fit=crop', link: '/menu?category=Pizza', badge: 'Chef Pick' },
    { title: 'Flame-Grilled', desc: 'Sizzle & smoke', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=450&fit=crop', link: '/menu?category=Flame-Grilled', badge: null },
    { title: 'Burgers', desc: 'Juicy & bold', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=450&fit=crop', link: '/menu?category=Burgers', badge: 'Popular' },
    { title: 'Cocktails', desc: 'Crafted cocktails', image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&h=450&fit=crop', link: '/menu?category=Cocktails', badge: null },
    { title: 'Desserts', desc: 'Sweet endings', image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&h=450&fit=crop', link: '/menu?category=Desserts', badge: null },
    { title: 'Curries & Bunnies', desc: 'Rich & aromatic', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=450&fit=crop', link: '/menu?category=Curries+%26+Bunnies', badge: null },
    { title: 'Kids Corner', desc: 'Little favorites', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&h=450&fit=crop', link: '/menu?category=Kids+Corner', badge: null },
  ];

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
        {/* Hero Section - Premium Design */}
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
              <Link href="/menu" className="btn btn-primary">View Menu</Link>
              <Link href="/contact" className="btn btn-ghost">Book a Table</Link>
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

        {/* Food & Drinks Experience - Premium Showcase */}
        <section className="premium-showcase">
          <div className="container">
            <div className="section-header">
              <span className="section-badge">Explore Our Menu</span>
              <h2>Food & Drinks Experience</h2>
              <p>From sunrise breakfasts to handcrafted cocktails, discover culinary excellence</p>
            </div>

            <div className="showcase-grid">
              {showcaseCategories.map((category, idx) => (
                <Link key={idx} href={category.link} className="showcase-card">
                  <div className="showcase-card-image">
                    <img src={category.image} alt={category.title} />
                    <div className="showcase-card-overlay" />
                    {category.badge && (
                      <span className={`showcase-badge ${category.badge === 'Chef Pick' ? 'chef-pick' : ''}`}>
                        {category.badge}
                      </span>
                    )}
                  </div>
                  <div className="showcase-card-content">
                    <h3>{category.title}</h3>
                    <p>{category.desc}</p>
                    <span className="showcase-cta">Explore <span>→</span></span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="section-cta">
              <Link href="/menu" className="btn btn-primary btn-lg">View Full Menu</Link>
            </div>
          </div>
        </section>

        {/* About Section - Premium Design */}
        <section className="about-section">
          <div className="container">
            <div className="about-grid">
              <div className="about-content">
                <span className="section-badge">Welcome to The Boma Cafe</span>
                <h3>{siteSettings?.about?.introTitle || 'Authentic Rustic Charm'}</h3>
                <p>
                  {siteSettings?.about?.introDescription || 'Escape the city hustle and step into a world of rustic charm at The Boma Cafe. Nestled in the heart of Sandton, our open-air restaurant is a hidden gem that will transport you to a different world.'}
                </p>
                <p>
                  {siteSettings?.about?.fullDescription || 'Experience the perfect blend of rustic elegance and modern sophistication, designed to transport you away from the chaos of everyday life.'}
                </p>
                
                <div className="about-features">
                  {[
                    { icon: '🔥', title: 'Cozy Firepits', desc: 'Warm glow for romantic evenings' },
                    { icon: '🌿', title: 'Lush Greenery', desc: 'Surrounded by nature' },
                    { icon: '🏠', title: 'Thatched Roof', desc: 'Authentic African architecture' }
                  ].map((feature, index) => (
                    <div key={index} className="about-feature">
                      <div className="about-feature-icon">{feature.icon}</div>
                      <div>
                        <strong>{feature.title}</strong>
                        <span>{feature.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Link href="/about" className="about-link">
                  Learn more about us <span>→</span>
                </Link>
              </div>
              
              <div className="about-image">
                <img 
                  src={siteSettings?.about?.heroImage || '/images/about.jpg'} 
                  alt="Boma Cafe Interior"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Welcome Banner */}
        <section className="welcome-banner">
          <div className="container">
            <h2>{homepage.welcomeTitle || 'More than just a place to eat'}</h2>
            <div className="banner-divider" />
            <p>{homepage.welcomeDescription || 'The Boma Cafe is a place to experience!'}</p>
          </div>
        </section>

        {/* Signature Dishes Section */}
        <section className="signature-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge gold">Chef's Recommendations</span>
              <h2>Signature Dishes</h2>
              <p>Explore our chef's recommended selections</p>
            </div>
            
            <div className="signature-grid">
              {[
                { name: 'Classic Beef Burger', desc: 'Angus patty, cheddar, caramelized onions, fresh tomato & house sauce', price: 165, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', category: 'Burgers' },
                { name: 'Lamb Bunny Chow', desc: 'Slow-cooked lamb in aromatic spices, served in fresh bread bowl', price: 120, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop', category: 'Curries' },
                { name: 'BBQ Chicken Pizza', desc: 'Grilled chicken, red onions, cilantro on smoky BBQ base', price: 180, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', category: 'Pizza' },
                { name: 'Flame-Grilled Ribs', desc: 'Succulent ribs with our signature BBQ basting', price: 250, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop', category: 'Flame-Grilled' }
              ].map((item: any, idx: number) => (
                <Link href="/menu" key={idx} className="signature-card">
                  <div className="signature-card-image">
                    <img src={item.image} alt={item.name} />
                    <span className="signature-badge">★ Featured</span>
                  </div>
                  <div className="signature-card-content">
                    <h4>{item.name}</h4>
                    <p>{item.desc}</p>
                    <div className="signature-card-footer">
                      <span className="signature-price">R{item.price}</span>
                      <span className="signature-link">View Menu →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="section-cta">
              <Link href="/menu" className="btn btn-primary">View Full Menu</Link>
            </div>
          </div>
        </section>

        {/* Events Section */}
        {upcomingEvents.length > 0 && (
          <section className="events-section">
            <div className="container">
              <div className="section-header">
                <span className="section-badge primary">What's Happening</span>
                <h2>Upcoming Events</h2>
                <p>Join us for memorable experiences</p>
              </div>
              
              <div className="events-grid">
                {upcomingEvents.map((event: any) => (
                  <Link href="/events" key={event.id} className="event-card">
                    <div className="event-card-image">
                      <img src={event.coverImage || '/images/events.jpg'} alt={event.title} />
                      <div className="event-date">
                        <span className="event-day">{new Date(event.date).getDate()}</span>
                        <span className="event-month">{new Date(event.date).toLocaleDateString('en-ZA', { month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="event-card-content">
                      <h4>{event.title}</h4>
                      <p>{event.description}</p>
                      <div className="event-meta">
                        <span>📍 {event.location}</span>
                        <span>🕐 {event.time}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="section-cta">
                <Link href="/events" className="btn btn-primary">View All Events</Link>
              </div>
            </div>
          </section>
        )}

        {/* Promotions Section */}
        {activePromotions.length > 0 && (
          <section className="promotions-section">
            <div className="container">
              <div className="section-header light">
                <h2>Special Offers</h2>
                <p>Don&apos;t miss out on our current promotions</p>
              </div>
              
              <div className="promotions-grid">
                {activePromotions.map((promo: any) => (
                  <div key={promo.id} className="promo-card">
                    <h3>{promo.title}</h3>
                    <p>{promo.description}</p>
                    <Link href={promo.ctaLink} className="btn btn-secondary">{promo.ctaText}</Link>
                  </div>
                ))}
              </div>

              <div className="section-cta">
                <Link href="/promotions" className="btn btn-ghost">View All Promotions</Link>
              </div>
            </div>
          </section>
        )}

        {/* Testimonials Section */}
        <section className="testimonials-section">
          <div className="container">
            <div className="section-header">
              <span className="section-badge gold">Guest Reviews</span>
              <h2>What Our Guests Say</h2>
              <p>Hear from our satisfied customers</p>
            </div>
            
            <div className="testimonials-grid">
              {[
                { text: "Absolutely stunning venue! The rustic atmosphere with the thatched roof and firepits creates the perfect escape from city life. The food is incredible and the service is top-notch.", author: "Sarah M.", location: "Johannesburg" },
                { text: "We've been coming here for years and it never disappoints. The Boma Breakfast is a must-try, and the outdoor seating area is perfect for families. Love the live music on weekends!", author: "David K.", location: "Sandton" },
                { text: "Best hidden gem in Sandton! The curry bunny chow is authentic and delicious. Staff are friendly and welcoming. Perfect for both date nights and family dinners.", author: "Priya S.", location: "Fourways" }
              ].map((testimonial: any, idx: number) => (
                <div key={idx} className="testimonial-card">
                  <div className="testimonial-quote">"</div>
                  <div className="testimonial-stars">★★★★★</div>
                  <p>{testimonial.text}</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{testimonial.author.charAt(0)}</div>
                    <div>
                      <strong>{testimonial.author}</strong>
                      <span>{testimonial.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-bg" />
          <div className="container">
            <span className="section-badge gold">Reservations</span>
            <h2>Ready to Experience The Boma?</h2>
            <p>Book your table or reserve your event space today. We can't wait to welcome you!</p>
            <div className="cta-buttons">
              <Link href="/contact" className="btn btn-primary btn-lg">Book a Table</Link>
              <Link href="/events" className="btn btn-ghost btn-lg">Plan an Event</Link>
            </div>
            
            <div className="cta-info">
              <div>
                <span>📞</span>
                <strong>Call Us</strong>
                <a href="tel:0729962212">072 996 2212</a>
              </div>
              <div>
                <span>✉️</span>
                <strong>Email</strong>
                <a href="mailto:info@thebomacafe.co.za">info@thebomacafe.co.za</a>
              </div>
              <div>
                <span>📍</span>
                <strong>Location</strong>
                <span>Sandton, Johannesburg</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer settings={settings} branding={branding} />
    </>
  );
}