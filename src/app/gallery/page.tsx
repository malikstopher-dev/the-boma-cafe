'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import GalleryBoards from '@/components/gallery/GalleryBoards';
import OptimizedHero from '@/components/ui/OptimizedHero';
import { getReservationLink } from '@/data/businessInfo';
import styles from './Gallery.module.css';

const categories = ['All', 'Events', 'Food', 'Venue', 'People', 'Promotions'];

export default function GalleryPage() {
  const [settings, setSettings] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const publicData = await fetch('/api/cms/public', { cache: 'no-cache' }).then(r => r.json());
        setSettings(publicData.settings || {});
        setGallery(publicData.gallery || []);
      } catch (error) {
        console.error('Error loading gallery data:', error);
      }
    };
    loadData();
  }, []);

  const featuredImages = useMemo(() => {
    if (gallery.length === 0) return [];
    const featured = gallery.filter((g: any) => g.isFeatured);
    return featured.length > 0 ? featured : gallery.slice(0, 6);
  }, [gallery]);

  useEffect(() => {
    if (featuredImages.length === 0) return;
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % featuredImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featuredImages.length]);

  const filteredGallery = activeCategory === 'All' 
    ? gallery 
    : gallery.filter((item: any) => item.category === activeCategory);

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxImage(images[index]);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const goToPrev = () => {
    const newIndex = lightboxIndex > 0 ? lightboxIndex - 1 : lightboxImages.length - 1;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const goToNext = () => {
    const newIndex = lightboxIndex < lightboxImages.length - 1 ? lightboxIndex + 1 : 0;
    setLightboxIndex(newIndex);
    setLightboxImage(lightboxImages[newIndex]);
  };

  const handleCategoryClick = (cat: string) => {
    setActiveCategory(cat);
    setTimeout(() => {
      const gridSection = document.getElementById('gallery-grid');
      if (gridSection) {
        gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const contactPhoneRaw = settings?.contact?.phone?.replace(/\s/g, '') || '';
  const reservationLink = getReservationLink(contactPhoneRaw);

  return (
    <>
      <Header />
      <main>
        <div style={isMobile ? { marginTop: '-60px' } : undefined}>
          <OptimizedHero
            poster="/hero/hero-gallery.jpg"
            videoSrc="/videos/gallery-hero.mp4"
            mobileVideoSrc="/videos/gallery-mobile.mp4"
            contentAlign={isMobile ? 'center' : 'bottom'}
          >
            {!isMobile && (
              <>
                <div style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
                  padding: '0.4rem 1.25rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--dark-brown)',
                  marginBottom: '1rem',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}>
                  Our Gallery
                </div>
                <h1 style={{
                  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                  color: 'var(--white)',
                  marginBottom: '1rem',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  textShadow: '0 3px 25px rgba(0,0,0,0.35)',
                  letterSpacing: '-0.5px',
                }}>
                  Gallery
                </h1>
                <p style={{
                  color: 'rgba(253, 248, 243, 0.92)',
                  fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                  maxWidth: '650px',
                  margin: '0 auto',
                  lineHeight: 1.65,
                  textShadow: '0 2px 15px rgba(0,0,0,0.25)',
                }}>
                  Food, fire, people, music and open-air moments at The Boma Café.
                </p>
              </>
            )}
          </OptimizedHero>
        </div>

        {isMobile && (
          <div style={{
            background: '#1a0f0a',
            padding: '2rem 5% 3rem',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, var(--warm) 0%, var(--warm-light) 100%)',
              padding: '0.4rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--dark-brown)',
              marginBottom: '1rem',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
            }}>
              Our Gallery
            </div>
            <h1 style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              color: 'var(--white)',
              marginBottom: '1rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}>
              Gallery
            </h1>
            <p style={{
              color: 'rgba(253, 248, 243, 0.92)',
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.65,
            }}>
              Food, fire, people, music and open-air moments at The Boma Café.
            </p>
          </div>
        )}

        {/* Featured Moments Carousel */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-2xl) 5%' }}>
          <div style={{
            maxWidth: '1100px',
            height: '500px',
            margin: '0 auto',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(26, 15, 10, 0.15)'
          }} onClick={() => featuredImages.length > 0 && openLightbox(featuredImages.map((i: any) => i.url), featuredIndex)}>
            {featuredImages.length > 0 ? (
            <div 
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${featuredImages[featuredIndex]?.url || ''})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'opacity 0.6s ease'
              }}
            />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '3rem' }}>📷</span>
              </div>
            )}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(26,15,10,0.75) 0%, transparent 60%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '2.5rem'
            }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  background: 'var(--primary)',
                  color: 'var(--white)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  marginBottom: '0.75rem',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>
                  Featured
                </span>
                <h2 style={{ color: 'var(--white)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600 }}>
                  Welcome to The Boma Cafe
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem', fontSize: '1rem' }}>
                  Experience the rustic charm and warm hospitality
                </p>
              </div>
            </div>
            <button 
              style={{
                position: 'absolute',
                top: '50%',
                left: '1rem',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                border: 'none',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                transition: 'all 0.3s ease',
                zIndex: 2
              }} 
              onClick={(e) => { e.stopPropagation(); setFeaturedIndex(prev => prev > 0 ? prev - 1 : featuredImages.length - 1); }}
            >
              ‹
            </button>
            <button 
              style={{
                position: 'absolute',
                top: '50%',
                right: '1rem',
                transform: 'translateY(-50%)',
                background: 'rgba(0, 0, 0, 0.4)',
                color: 'white',
                border: 'none',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                transition: 'all 0.3s ease',
                zIndex: 2
              }}
              onClick={(e) => { e.stopPropagation(); setFeaturedIndex(prev => (prev + 1) % featuredImages.length); }}
            >
              ›
            </button>
            <div style={{
              position: 'absolute',
              bottom: '1.25rem',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '10px',
              zIndex: 2
            }}>
              {featuredImages.map((_, idx) => (
                <button
                  key={idx}
                  style={{
                    width: idx === featuredIndex ? '28px' : '10px',
                    height: '10px',
                    borderRadius: idx === featuredIndex ? '6px' : '50%',
                    background: idx === featuredIndex ? 'var(--warm)' : 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.3s ease'
                  }}
                  onClick={(e) => { e.stopPropagation(); setFeaturedIndex(idx); }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Category Boards Section */}
        <GalleryBoards onImageClick={openLightbox} onCategoryClick={handleCategoryClick} galleryItems={gallery} />

        {/* Filtered Gallery Grid */}
        <section id="gallery-grid" style={{ background: 'var(--white)', padding: 'var(--space-3xl) 5%' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginBottom: '1rem' }}>
                {activeCategory === 'All' ? 'All Photos' : `${activeCategory} Photos`}
              </h2>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '25px',
                      border: 'none',
                      background: activeCategory === cat ? 'var(--primary)' : 'var(--cream)',
                      color: activeCategory === cat ? 'var(--white)' : 'var(--dark-brown)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredGallery.length > 0 ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '1rem' 
              }}>
                {filteredGallery.map((item: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => openLightbox(filteredGallery.map((i: any) => i.imageUrl || i.url), idx)}
                  >
                    <img 
                      src={item.imageUrl || item.url} 
                      alt={item.alt || `Gallery ${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '4rem 2rem', 
                background: 'var(--cream)', 
                borderRadius: '16px' 
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📷</div>
                <h3 style={{ color: 'var(--dark-brown)', marginBottom: '0.5rem' }}>No photos in this category</h3>
                <p style={{ color: 'var(--text-light)' }}>Check back soon for new moments from The Boma Café.</p>
              </div>
            )}
          </div>
        </section>

        {/* Atmosphere CTA */}
        <section style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', color: 'var(--white)', marginBottom: '1rem' }}>
              Step Inside The Boma Atmosphere
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Explore our open-air setting, firepit evenings, food moments and celebrations.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link href="/experience" style={{
                padding: '1rem 2rem',
                background: 'var(--white)',
                color: 'var(--primary)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                View Experience
              </Link>
              <a href={reservationLink} target="_blank" rel="noopener noreferrer" style={{
                padding: '1rem 2rem',
                background: 'transparent',
                color: 'var(--white)',
                border: '2px solid var(--white)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Book via WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Social CTA */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-3xl) 5%', textAlign: 'center' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--dark-brown)', marginBottom: '1.5rem' }}>
              Follow the atmosphere
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a 
                href="https://www.instagram.com/the_boma_cafe" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(225, 48, 108, 0.3)'
                }}
              >
                <span>📷</span>
                <span>Instagram</span>
              </a>
              <a 
                href="https://www.tiktok.com/@thebomacafe" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: '#000',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                }}
              >
                <span>🎵</span>
                <span>TikTok</span>
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=61552775920918" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: '#1877f2',
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(24, 119, 242, 0.3)'
                }}
              >
                <span>👍</span>
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </section>

        {/* Lightbox */}
        {lightboxImage && (
          <div className={styles.lightbox} onClick={closeLightbox}>
            <img 
              src={lightboxImage} 
              alt="Gallery" 
              className={styles.lightboxImage}
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className={styles.lightboxClose}
              onClick={closeLightbox}
            >
              ✕
            </button>
            {lightboxImages.length > 1 && (
              <>
                <button 
                  className={styles.lightboxPrev}
                  onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                >
                  ‹
                </button>
                <button 
                  className={styles.lightboxNext}
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                >
                  ›
                </button>
              </>
            )}
          </div>
        )}
      </main>
      <Footer settings={settings} />
    </>
  );
}