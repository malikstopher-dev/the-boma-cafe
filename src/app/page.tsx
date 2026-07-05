'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import AnnouncementBar from '@/components/ui/AnnouncementBar';
import WeekendBuffetPopup from '@/components/ui/WeekendBuffetPopup';
import FadeInSection from '@/components/ui/FadeInSection';
import UpcomingEventsSection from '@/components/sections/UpcomingEventsSection';
import AboutSection from '@/components/sections/AboutSection';
import { getReservationLink, getEventEnquiryLink } from '@/data/businessInfo';
import { useBookingModal } from '@/lib/booking';
import styles from './page.module.css';

// eventSlideshowImages moved to UpcomingEventsSection component

const showcaseCategories = [
  { title: 'Signature Meals', desc: 'Chef-crafted masterpieces', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=450&fit=crop', link: '/menu?category=Signature', badge: 'Chef Pick' },
  { title: 'Wood-Fired Pizza', desc: 'Handcrafted perfection', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=450&fit=crop', link: '/menu?category=Pizza', badge: null },
  { title: 'Cocktails & Drinks', desc: 'Artisan crafted', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=450&fit=crop', link: '/menu?category=Cocktails', badge: 'Popular' },
  { title: 'Platters', desc: 'For sharing moments', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=450&fit=crop', link: '/menu?category=Platters', badge: null },
  { title: 'Flame-Grilled', desc: 'Sizzling perfection', image: '/gallery/flame-grilled.jpg', link: '/menu?category=Flame-Grilled', badge: null },
  { title: 'Desserts', desc: 'Sweet endings', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=450&fit=crop', link: '/menu?category=Desserts', badge: null },
  { title: 'Curries & Bunnies', desc: 'Rich & aromatic', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=450&fit=crop', link: '/menu?category=Curries+%26+Bunnies', badge: null },
  { title: 'Breakfast', desc: 'Start your day right', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=450&fit=crop', link: '/menu?category=Breakfast', badge: null },
];

const signatureCocktails = [
  { name: 'Boma Sunset', desc: 'Aged rum, passion fruit, lime, hint of chilli', price: 125, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=500&fit=crop' },
  { name: 'Safari Sour', desc: 'Amarula, honey, citrus, vanilla bean', price: 115, image: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=500&fit=crop' },
  { name: 'Thatched Toddy', desc: 'Spiced rum, warm spices, fresh ginger', price: 135, image: '/bar-menu/Thatched-Toddy.jpg' },
  { name: 'Garden Spritz', desc: 'Gin, elderflower, cucumber, prosecco', price: 110, image: 'https://images.unsplash.com/photo-1560508180-03f285f67ded?w=400&h=500&fit=crop' },
];

const testimonials = [
  { text: "Absolutely stunning venue! The rustic atmosphere with the thatched roof and firepits creates the perfect escape from city life. The food is incredible and the service is top-notch.", author: "Sarah M.", location: "Johannesburg", rating: 5 },
  { text: "We've been coming here for years and it never disappoints. The Boma Breakfast is a must-try, and the outdoor seating area is perfect for families. Live music on weekends is the cherry on top!", author: "David K.", location: "Sandton", rating: 5 },
  { text: "Best hidden gem in Sandton! The curry bunny chow is authentic and absolutely delicious. Staff are incredibly friendly and welcoming. Perfect for both romantic dates and family dinners.", author: "Priya S.", location: "Fourways", rating: 5 },
  { text: "The ambiance is unmatched - there's something magical about dining under the stars with firepits glowing around you. Their wood-fired pizza is the best I've had in Joburg.", author: "Michael R.", location: "Rosebank", rating: 5 },
];

const galleryPreview = [
  { url: '/gallery/gallery/bomacafe2-large-1.jpg', alt: 'Boma Cafe Exterior' },
  { url: '/gallery/gallery/boy.jpg', alt: 'Happy Guest' },
  { url: '/gallery/gallery/gallery-7-800x600.jpeg', alt: 'Food Spread' },
  { url: '/gallery/people/boma1-1152x864.jpeg', alt: 'The Experience' },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[...Array(5)].map((_, i) => (
        <span key={i} className={i < rating ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </div>
  );
}

export default function Home() {
  const { openBookingModal } = useBookingModal();
  const [settings, setSettings] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [popup, setPopup] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const [publicData, itemsRes] = await Promise.all([
          fetch('/api/cms/public', { cache: 'no-cache' }).then(r => r.json()),
          fetch('/api/menu/public', { cache: 'no-cache' }).then(r => r.json()),
        ]);
        const items = itemsRes?.menuItems || [];
        setSiteSettings(publicData.settings);
        setSettings(publicData.settings);
        setAnnouncement(publicData.announcement);
        setPopup(publicData.popup);
        setMenuItems(items);
        setEvents(publicData.events);
        setPromotions(publicData.promotions);
      } catch (error) {
        console.error('Error loading CMS data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const galleryTimer = setInterval(() => {
      setGalleryIndex((prev) => (prev + 1) % galleryPreview.length);
    }, 4000);
    return () => clearInterval(galleryTimer);
  }, []);
  
  const featuredMenuItems = menuItems.filter((item: any) => item.isFeatured && !item.isOutOfStock).slice(0, 4);
  const upcomingEvents = events.filter((event: any) => event.isUpcoming && event.visible !== false).slice(0, 3);
  const activePromotions = promotions.filter((promo: any) => promo.isActive && promo.displayOnHomepage).slice(0, 2);

  const homepage = siteSettings?.homepage || {};
  const promoBar = siteSettings?.promoBar || {};
  const branding = siteSettings?.branding || {};

  const contactSettings = siteSettings?.contact || {};
  const contactPhoneRaw = contactSettings.phone?.replace(/\s/g, '') || '';

  const annText = announcement?.isEnabled ? announcement.text : null;
  const annLink = announcement?.isEnabled ? announcement.link : null;
  const annLinkText = announcement?.isEnabled ? announcement.linkText : null;
  const displayAnnText = annText || (promoBar.isEnabled ? promoBar.message : null);
  const displayAnnLink = annLink || (promoBar.isEnabled ? promoBar.buttonLink : null);
  const displayAnnLinkText = annLinkText || (promoBar.isEnabled ? promoBar.buttonText : null);

  return (
    <>
      {displayAnnText && (
        <AnnouncementBar 
          text={displayAnnText} 
          link={displayAnnLink} 
          linkText={displayAnnLinkText}
        />
      )}
      <Header />
      <WeekendBuffetPopup popup={popup} />
      
      <main>
        <Hero />

        {/* About Section - Premium Design - Moved after Hero */}
        <AboutSection 
          introTitle={siteSettings?.about?.introTitle}
          introDescription={siteSettings?.about?.introDescription}
          fullDescription={siteSettings?.about?.fullDescription}
          heroImage={siteSettings?.about?.heroImage}
        />

        {/* Premium Food & Drinks Showcase */}
        <section className={styles.premiumShowcase}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge">Culinary Journey</span>
              <h2>Food & Drinks Experience</h2>
              <p>From sunrise breakfasts to handcrafted cocktails, discover culinary excellence</p>
            </FadeInSection>

            <div className={styles.showcaseGrid}>
              {showcaseCategories.map((category, idx) => (
                <FadeInSection key={idx} delay={idx * 100} className={styles.showcaseCardWrapper}>
                  <Link href={category.link} className={styles.showcaseCard}>
                    <div className={styles.showcaseCardImage}>
                      <img src={category.image} alt={category.title} loading="lazy" decoding="async" />
                      <div className={styles.showcaseCardOverlay} />
                      {category.badge && (
                        <span className={`${styles.showcaseBadge} ${category.badge === 'Chef Pick' ? styles.chefPick : ''}`}>
                          {category.badge}
                        </span>
                      )}
                    </div>
                    <div className={styles.showcaseCardContent}>
                      <h3>{category.title}</h3>
                      <p>{category.desc}</p>
                      <span className={styles.showcaseCta}>Explore <span>→</span></span>
                    </div>
                  </Link>
                </FadeInSection>
              ))}
            </div>

            <FadeInSection className={styles.sectionCta}>
              <Link href="/menu" className="btn btn-primary btn-lg">View Full Menu</Link>
            </FadeInSection>
          </div>
        </section>

        {/* Signature Dishes Section */}
        <section className={styles.signatureSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge gold">Chef's Recommendations</span>
              <h2>Signature Dishes</h2>
              <p>Explore our chef's recommended selections</p>
            </FadeInSection>
            
            <div className={styles.signatureGrid}>
              {[
                { name: 'Classic Beef Burger', desc: 'Angus patty, cheddar, caramelized onions, fresh tomato & house sauce', price: 165, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', category: 'Burgers' },
                { name: 'Lamb Bunny Chow', desc: 'Slow-cooked lamb in aromatic spices, served in fresh bread bowl', price: 120, image: '/menu/lamb-bunny-chow.jpg', category: 'Curries' },
                { name: 'BBQ Chicken Pizza', desc: 'Grilled chicken, red onions, cilantro on smoky BBQ base', price: 180, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', category: 'Pizza' },
                { name: 'Flame-Grilled Ribs', desc: 'Succulent ribs with our signature BBQ basting', price: 250, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop', category: 'Flame-Grilled' }
              ].map((item: any, idx: number) => (
                <FadeInSection key={idx} delay={idx * 100} className={styles.signatureCardWrapper}>
                  <Link href="/menu" className={styles.signatureCard}>
                    <div className={styles.signatureCardImage}>
                      <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                      <span className={styles.signatureBadge}>★ Featured</span>
                    </div>
                    <div className={styles.signatureCardContent}>
                      <h4>{item.name}</h4>
                      <p>{item.desc}</p>
                      <div className={styles.signatureCardFooter}>
                        <span className={styles.signaturePrice}>R{item.price}</span>
                        <span className={styles.signatureLink}>View Menu →</span>
                      </div>
                    </div>
                  </Link>
                </FadeInSection>
              ))}
            </div>

            <FadeInSection className={styles.sectionCta}>
              <Link href="/menu" className="btn btn-primary">View Full Menu</Link>
            </FadeInSection>
          </div>
        </section>

        {/* Premium Signature Cocktails Section */}
        <section className={styles.cocktailsSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge gold">Libations</span>
              <h2>Signature Cocktails</h2>
              <p>Artisan-crafted cocktails that capture the spirit of Africa</p>
            </FadeInSection>

            <div className={styles.cocktailsGrid}>
              {signatureCocktails.map((cocktail, idx) => (
                <FadeInSection key={idx} delay={idx * 100} className={styles.cocktailCardWrapper}>
                  <div className={styles.cocktailCard}>
                    <div className={styles.cocktailImageWrapper}>
                      <img src={cocktail.image} alt={cocktail.name} className={styles.cocktailImage} loading="lazy" decoding="async" />
                      <div className={styles.cocktailOverlay} />
                    </div>
                    <div className={styles.cocktailContent}>
                      <h4>{cocktail.name}</h4>
                      <p>{cocktail.desc}</p>
                      <span className={styles.cocktailPrice}>R{cocktail.price}</span>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>

            <FadeInSection className={styles.sectionCta}>
              <Link href="/bar-menu" className="btn btn-secondary btn-lg">Explore Our Bar</Link>
            </FadeInSection>
          </div>
        </section>

        {/* Premium Events Section */}
        <UpcomingEventsSection
          events={upcomingEvents}
          slideshowImages={upcomingEvents
            .filter((e: any) => e.coverImage || e.image)
            .map((e: any) => ({ src: e.coverImage || e.image, alt: e.title }))}
        />

        {/* Premium Gallery Preview Section */}
        <section className={styles.gallerySection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge">Gallery</span>
              <h2>Captured Moments</h2>
              <p>A glimpse into the Boma Cafe experience</p>
            </FadeInSection>

            <FadeInSection animationType="scale" className={styles.galleryPreviewWrapper}>
              <div className={styles.galleryPreview}>
                <div className={styles.galleryMainImage}>
                  <img src={galleryPreview[galleryIndex].url} alt={galleryPreview[galleryIndex].alt} loading="lazy" decoding="async" />
                  <div className={styles.galleryOverlay} />
                  <button className={styles.galleryNavPrev} onClick={() => setGalleryIndex(prev => prev > 0 ? prev - 1 : galleryPreview.length - 1)}>‹</button>
                  <button className={styles.galleryNavNext} onClick={() => setGalleryIndex(prev => (prev + 1) % galleryPreview.length)}>›</button>
                  <div className={styles.galleryDots}>
                    {galleryPreview.map((_, idx) => (
                      <button
                        key={idx}
                        className={`${styles.galleryDot} ${idx === galleryIndex ? styles.active : ''}`}
                        onClick={() => setGalleryIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection className={styles.sectionCta}>
              <Link href="/gallery" className="btn btn-primary">Explore Full Gallery</Link>
            </FadeInSection>
          </div>
        </section>

        {/* Promotions Section */}
        {activePromotions.length > 0 && (
          <section className={styles.promotionsSection}>
            <div className="container">
              <FadeInSection className={`${styles.sectionHeader} light`}>
                <h2>Special Offers</h2>
                <p>Don&apos;t miss out on our current promotions</p>
              </FadeInSection>
              
              <div className={styles.promotionsGrid}>
                {activePromotions.map((promo: any) => (
                  <FadeInSection key={promo.id} className={styles.promoCard}>
                    <h3>{promo.title}</h3>
                    <p>{promo.description}</p>
                    {promo.ctaLink ? (
                      <Link href={promo.ctaLink} className="btn btn-secondary">{promo.ctaText || 'Learn More'}</Link>
                    ) : (
                      <Link href="/promotions" className="btn btn-secondary">{promo.ctaText || 'Learn More'}</Link>
                    )}
                  </FadeInSection>
                ))}
              </div>

              <FadeInSection className={styles.sectionCta}>
                <Link href="/promotions" className="btn btn-ghost">View All Promotions</Link>
              </FadeInSection>
            </div>
          </section>
        )}

        {/* Premium Testimonials Section */}
        <section className={styles.testimonialsSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge gold">Guest Reviews</span>
              <h2>What Our Guests Say</h2>
              <p>Stories from our cherished patrons</p>
            </FadeInSection>
            
            <div className={styles.testimonialsGrid}>
              {testimonials.map((testimonial: any, idx: number) => (
                <FadeInSection key={idx} delay={idx * 100} className={styles.testimonialCardWrapper}>
                  <div className={styles.testimonialCard}>
                    <div className={styles.testimonialQuote}>"</div>
                    <StarRating rating={testimonial.rating} />
                    <p className={styles.testimonialText}>{testimonial.text}</p>
                    <div className={styles.testimonialAuthor}>
                      <div className={styles.testimonialAvatar}>{testimonial.author.charAt(0)}</div>
                      <div>
                        <strong>{testimonial.author}</strong>
                        <span>{testimonial.location}</span>
                      </div>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* Premium Reservation CTA Section */}
        <section className={styles.reservationSection}>
          <div className={styles.reservationBg} />
          <div className="container">
            <FadeInSection className={styles.reservationContent}>
              <span className="section-badge gold">Reservations</span>
              <h2>Reserve Your Table</h2>
              <p>Plan your perfect Boma experience. Whether it's a romantic dinner, family gathering, or celebration with friends, we're ready to welcome you.</p>
              <div className={styles.reservationButtons}>
                <a href={getReservationLink(contactPhoneRaw)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg">Book a Table</a>
                <a href={getEventEnquiryLink(contactPhoneRaw)} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">Plan an Event</a>
              </div>
              
              <div className={styles.reservationInfo}>
                <div className={styles.reservationInfoItem}>
                  <span className={styles.reservationInfoIcon}>📞</span>
                  <strong>Call Us</strong>
                  <a href="tel:0715921190">071 592 1190</a>
                </div>
                <div className={styles.reservationInfoItem}>
                  <span className={styles.reservationInfoIcon}>✉️</span>
                  <strong>Email</strong>
                  <a href="mailto:info@thebomacafe.co.za">info@thebomacafe.co.za</a>
                </div>
                <div className={styles.reservationInfoItem}>
                  <span className={styles.reservationInfoIcon}>📍</span>
                  <strong>Location</strong>
                  <span>Sandton, Johannesburg</span>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* About the Founder - Premium Compact Section */}
        <section style={{
          background: 'linear-gradient(180deg, var(--cream) 0%, var(--beige) 100%)',
          padding: 'var(--space-3xl) 5%',
          position: 'relative'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="founder-card" style={{
              background: 'var(--white)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 4px 20px rgba(26, 15, 10, 0.08)',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '2rem',
              alignItems: 'center'
            }}>
              {/* Founder Image */}
              <div className="founder-image" style={{
                width: '140px',
                height: '140px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid var(--primary)',
                boxShadow: '0 4px 16px rgba(194, 106, 45, 0.25)',
                flexShrink: 0
              }}>
                <Image
                  src="/gallery/people/mahendra.jpg"
                  alt="Mahendra Singh, Founder of The Boma Café Sandton"
                  width={140}
                  height={140}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
              
              {/* Founder Content */}
              <div>
                <div style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: 'var(--white)',
                  padding: '0.3rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  marginBottom: '1rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  About the Founder
                </div>
                <h3 style={{
                  fontSize: 'clamp(1.5rem, 2.5vw, 1.75rem)',
                  color: 'var(--dark-brown)',
                  marginBottom: '0.75rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600
                }}>
                  Mahendra Singh
                </h3>
                <p style={{
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginBottom: '1rem'
                }}>
                  Mahendra Singh is the visionary behind The Boma Café Sandton, bringing a refined approach to hospitality shaped by years of experience in retail and restaurant operations. Having built his foundation with Pick n Pay and later creating ventures such as 101 on Fraser, he combines business insight with a passion for exceptional guest experiences.
                </p>
                <p style={{
                  color: 'var(--text)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  marginBottom: '1rem',
                  fontStyle: 'italic'
                }}>
                  "A place where food, atmosphere, and people come together."
                </p>
                
                {/* Credibility Badges */}
                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  {[
                    { icon: '🏪', label: 'Pick n Pay Experience' },
                    { icon: '✨', label: 'Creator of 101 on Fraser' },
                    { icon: '👔', label: 'Hospitality Leadership' }
                  ].map((badge, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'var(--cream)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      color: 'var(--text)',
                      fontWeight: 500
                    }}>
                      <span>{badge.icon}</span>
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer settings={settings} branding={branding} />
    </>
  );
}
