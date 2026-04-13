'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AnnouncementBar from '@/components/ui/AnnouncementBar';
import PopupModal from '@/components/ui/PopupModal';
import { cmsService } from '@/lib/client-cms';
import styles from './page.module.css';

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

const showcaseCategories = [
  { title: 'Signature Meals', desc: 'Chef-crafted masterpieces', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=450&fit=crop', link: '/menu?category=Signature', badge: 'Chef Pick' },
  { title: 'Wood-Fired Pizza', desc: 'Handcrafted perfection', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=450&fit=crop', link: '/menu?category=Pizza', badge: null },
  { title: 'Cocktails & Drinks', desc: 'Artisan crafted', image: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600&h=450&fit=crop', link: '/menu?category=Cocktails', badge: 'Popular' },
  { title: 'Platters', desc: 'For sharing moments', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&h=450&fit=crop', link: '/menu?category=Platters', badge: null },
  { title: 'Flame-Grilled', desc: 'Sizzling perfection', image: 'https://images.unsplash.com/photo-1555041469-a586c61b9fe4?w=600&h=450&fit=crop', link: '/menu?category=Flame-Grilled', badge: null },
  { title: 'Desserts', desc: 'Sweet endings', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=450&fit=crop', link: '/menu?category=Desserts', badge: null },
  { title: 'Curries & Bunnies', desc: 'Rich & aromatic', image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=450&fit=crop', link: '/menu?category=Curries+%26+Bunnies', badge: null },
  { title: 'Breakfast', desc: 'Start your day right', image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&h=450&fit=crop', link: '/menu?category=Breakfast', badge: null },
];

const experienceBlocks = [
  {
    icon: '🌿',
    title: 'Escape the City',
    description: 'Step into our tranquil outdoor sanctuary, where lush greenery and thatched roofing create an oasis of calm.',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop'
  },
  {
    icon: '🔥',
    title: 'Fire & Flavour',
    description: 'Experience the magic of our open flame cooking, where every dish carries the essence of fire-kissed perfection.',
    image: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=800&h=600&fit=crop'
  },
  {
    icon: '🎵',
    title: 'Live Entertainment',
    description: 'Immerse yourself in soulful live music on weekends, setting the perfect atmosphere for memorable evenings.',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop'
  },
  {
    icon: '❤️',
    title: 'Family Friendly',
    description: 'A welcoming space for all ages, where families gather to create cherished moments over delicious food.',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop'
  }
];

const signatureCocktails = [
  { name: 'Boma Sunset', desc: 'Aged rum, passion fruit, lime, hint of chilli', price: 125, image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=500&fit=crop' },
  { name: 'Safari Sour', desc: 'Amarula, honey, citrus, vanilla bean', price: 115, image: 'https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400&h=500&fit=crop' },
  { name: 'Thatched Toddy', desc: 'Spiced rum, warm spices, fresh ginger', price: 135, image: 'https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=400&h=500&fit=crop' },
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

function FadeInSection({ children, className = '', delay = 0, animationType = 'default' }: { children: React.ReactNode; className?: string; delay?: number; animationType?: 'default' | 'left' | 'right' | 'scale' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const animationClass = animationType === 'left' ? styles.revealLeft :
                         animationType === 'right' ? styles.revealRight :
                         animationType === 'scale' ? styles.revealScale : '';

  return (
    <div
      ref={ref}
      className={`${styles.fadeInSection} ${animationClass} ${isVisible ? styles.visible : ''} ${className}`}
    >
      {children}
    </div>
  );
}

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
  const [settings, setSettings] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [popup, setPopup] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
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

  useEffect(() => {
    const galleryTimer = setInterval(() => {
      setGalleryIndex((prev) => (prev + 1) % galleryPreview.length);
    }, 4000);
    return () => clearInterval(galleryTimer);
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
        {/* Hero Section - Premium Design */}
        <section className={styles.heroSection}>
          {heroSlides.map((slide, index) => (
            <div
              key={index}
              className={`${styles.heroSlide} ${index === currentSlide ? styles.active : ''}`}
            >
              <div className={styles.heroSlideBg} style={{ backgroundImage: `url(${slide.image})` }} />
            </div>
          ))}
          <div className={styles.heroOverlay} />
          
          <div className={styles.heroContent}>
            <p className={styles.heroSubtitle}>{heroSlides[currentSlide].subtitle}</p>
            <h1 className={styles.heroTitle}>
              {heroSlides[currentSlide].title}
              {heroSlides[currentSlide].titleAccent && <span className={styles.heroAccent}>{heroSlides[currentSlide].titleAccent}</span>}
            </h1>
            <p className={styles.heroTagline}>{heroSlides[currentSlide].tagline}</p>
            <div className={styles.heroCta}>
              <Link href="/menu" className="btn btn-primary">View Menu</Link>
              <Link href="/contact" className="btn btn-ghost">Book a Table</Link>
            </div>
          </div>

          <div className={styles.heroDots}>
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`${styles.heroDot} ${index === currentSlide ? styles.active : ''}`}
              />
            ))}
          </div>
        </section>

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
                      <img src={category.image} alt={category.title} />
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
                      <img src={cocktail.image} alt={cocktail.name} className={styles.cocktailImage} />
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
              <Link href="/menu?category=Cocktails" className="btn btn-secondary btn-lg">Explore Our Bar</Link>
            </FadeInSection>
          </div>
        </section>

        {/* Experience Section */}
        <section className={styles.experienceSection}>
          <div className="container">
            <FadeInSection className={styles.sectionHeader}>
              <span className="section-badge primary">The Boma Experience</span>
              <h2>More Than Just Dining</h2>
              <p>Where every visit becomes a cherished memory</p>
            </FadeInSection>

            <div className={styles.experienceGrid}>
              {experienceBlocks.map((exp, idx) => (
                <FadeInSection 
                  key={idx} 
                  delay={idx * 150} 
                  animationType={idx % 2 === 0 ? 'left' : 'right'}
                  className={`${styles.experienceCardWrapper} ${idx % 2 === 1 ? styles.reversed : ''}`}
                >
                  <div className={styles.experienceCard}>
                    <div className={styles.experienceImage}>
                      <img src={exp.image} alt={exp.title} />
                    </div>
                    <div className={styles.experienceContent}>
                      <div className={styles.experienceIcon}>{exp.icon}</div>
                      <h3>{exp.title}</h3>
                      <p>{exp.description}</p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* About Section - Premium Design */}
        <section className={styles.aboutSection}>
          <div className="container">
            <div className={styles.aboutGrid}>
              <FadeInSection className={styles.aboutContent}>
                <span className="section-badge">Welcome to The Boma Cafe</span>
                <h3>{siteSettings?.about?.introTitle || 'Authentic Rustic Charm'}</h3>
                <p>
                  {siteSettings?.about?.introDescription || 'Escape the city hustle and step into a world of rustic charm at The Boma Cafe. Nestled in the heart of Sandton, our open-air restaurant is a hidden gem that will transport you to a different world.'}
                </p>
                <p>
                  {siteSettings?.about?.fullDescription || 'Experience the perfect blend of rustic elegance and modern sophistication, designed to transport you away from the chaos of everyday life.'}
                </p>
                
                <div className={styles.aboutFeatures}>
                  {[
                    { icon: '🔥', title: 'Cozy Firepits', desc: 'Warm glow for romantic evenings' },
                    { icon: '🌿', title: 'Lush Greenery', desc: 'Surrounded by nature' },
                    { icon: '🏠', title: 'Thatched Roof', desc: 'Authentic African architecture' }
                  ].map((feature, index) => (
                    <div key={index} className={styles.aboutFeature}>
                      <div className={styles.aboutFeatureIcon}>{feature.icon}</div>
                      <div>
                        <strong>{feature.title}</strong>
                        <span>{feature.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Link href="/about" className={styles.aboutLink}>
                  Learn more about us <span>→</span>
                </Link>
              </FadeInSection>
              
              <FadeInSection delay={200} animationType="scale" className={styles.aboutImageWrapper}>
                <div className={styles.aboutImage}>
                  <img 
                    src={siteSettings?.about?.heroImage || '/images/about.jpg'} 
                    alt="Boma Cafe Interior"
                  />
                </div>
              </FadeInSection>
            </div>
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
                { name: 'Lamb Bunny Chow', desc: 'Slow-cooked lamb in aromatic spices, served in fresh bread bowl', price: 120, image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&h=400&fit=crop', category: 'Curries' },
                { name: 'BBQ Chicken Pizza', desc: 'Grilled chicken, red onions, cilantro on smoky BBQ base', price: 180, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', category: 'Pizza' },
                { name: 'Flame-Grilled Ribs', desc: 'Succulent ribs with our signature BBQ basting', price: 250, image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop', category: 'Flame-Grilled' }
              ].map((item: any, idx: number) => (
                <FadeInSection key={idx} delay={idx * 100} className={styles.signatureCardWrapper}>
                  <Link href="/menu" className={styles.signatureCard}>
                    <div className={styles.signatureCardImage}>
                      <img src={item.image} alt={item.name} />
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

        {/* Premium Events Section */}
        {upcomingEvents.length > 0 && (
          <section className={styles.eventsSection}>
            <div className="container">
              <FadeInSection className={styles.sectionHeader}>
                <span className="section-badge primary">What's Happening</span>
                <h2>Upcoming Events</h2>
                <p>Join us for memorable experiences</p>
              </FadeInSection>
              
              <div className={styles.eventsGrid}>
                {upcomingEvents.map((event: any) => (
                  <FadeInSection key={event.id} delay={event.id * 100} className={styles.eventCardWrapper}>
                    <Link href="/events" className={styles.eventCard}>
                      <div className={styles.eventCardImage}>
                        <img src={event.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop'} alt={event.title} />
                        <div className={styles.eventOverlay} />
                        <div className={styles.eventDate}>
                          <span className={styles.eventDay}>{new Date(event.date).getDate()}</span>
                          <span className={styles.eventMonth}>{new Date(event.date).toLocaleDateString('en-ZA', { month: 'short' })}</span>
                        </div>
                      </div>
                      <div className={styles.eventCardContent}>
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                        <div className={styles.eventMeta}>
                          <span>📍 {event.location}</span>
                          <span>🕐 {event.time}</span>
                        </div>
                        <button className={`btn btn-primary ${styles.eventCardBtn}`}>Book Now</button>
                      </div>
                    </Link>
                  </FadeInSection>
                ))}
              </div>

              <FadeInSection className={styles.sectionCta}>
                <Link href="/events" className="btn btn-primary">View All Events</Link>
              </FadeInSection>
            </div>
          </section>
        )}

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
                  <img src={galleryPreview[galleryIndex].url} alt={galleryPreview[galleryIndex].alt} />
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
                    <Link href={promo.ctaLink} className="btn btn-secondary">{promo.ctaText}</Link>
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
                <Link href="/contact" className="btn btn-primary btn-lg">Book a Table</Link>
                <Link href="/events" className="btn btn-secondary btn-lg">Plan an Event</Link>
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
      </main>

      <Footer settings={settings} branding={branding} />
    </>
  );
}
