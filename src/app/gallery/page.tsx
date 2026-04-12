'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { cmsService } from '@/lib/client-cms';
import GalleryBoards from '@/components/gallery/GalleryBoards';
import PremiumHero from '@/components/ui/PremiumHero';
import styles from './Gallery.module.css';

const topGalleryImages = [
  { url: '/gallery/gallery/bomacafe2-large-1.jpg', alt: 'The Boma Cafe exterior' },
  { url: '/gallery/gallery/boy.jpg', alt: 'Happy guest' },
  { url: '/gallery/gallery/cute.webp', alt: 'Cute moment' },
  { url: '/gallery/gallery/gallery-7-800x600.jpeg', alt: 'Gallery highlight' },
  { url: '/gallery/gallery/happy.jpg', alt: 'Happy times' },
  { url: '/gallery/gallery/mahendra.jpeg', alt: 'Mahendra' },
];

export default function GalleryPage() {
  const [settings, setSettings] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [topGalleryIndex, setTopGalleryIndex] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allSettings, gal] = await Promise.all([
          cmsService.getAllSettings(),
          cmsService.getGallery()
        ]);
        setSettings(allSettings);
        setGallery(gal);
      } catch (error) {
        console.error('Error loading gallery data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTopGalleryIndex(prev => (prev + 1) % topGalleryImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const categories = ['All', 'Events', 'Food', 'Venue', 'People', 'Promotions'];
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

  return (
    <>
      <Header />
      <main className={styles.main}>
        <PremiumHero
          imageUrl="/hero/hero-gallery.jpg"
          badge="Our Gallery"
          title="Gallery"
          subtitle="Capturing moments of joy, delicious food, and unforgettable experiences at The Boma Café"
        />

        {/* Top Gallery - Main Feature - Premium Design */}
        <section style={{ background: 'var(--white)', padding: 'var(--space-2xl) 5%' }}>
          <div style={{
            maxWidth: '1100px',
            height: '500px',
            margin: '0 auto',
            borderRadius: '24px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 'var(--shadow-lg)'
          }} onClick={() => openLightbox(topGalleryImages.map(i => i.url), topGalleryIndex)}>
            <div 
              style={{
                width: '100%',
                height: '100%',
                backgroundImage: `url(${topGalleryImages[topGalleryIndex].url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'opacity 0.6s ease'
              }}
            />
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
              onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(prev => prev > 0 ? prev - 1 : topGalleryImages.length - 1); }}
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
              onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(prev => (prev + 1) % topGalleryImages.length); }}
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
              {topGalleryImages.map((_, idx) => (
                <button
                  key={idx}
                  style={{
                    width: idx === topGalleryIndex ? '28px' : '10px',
                    height: '10px',
                    borderRadius: idx === topGalleryIndex ? '6px' : '50%',
                    background: idx === topGalleryIndex ? 'var(--warm)' : 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.3s ease'
                  }}
                  onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(idx); }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Gallery Boards Section */}
        <GalleryBoards onImageClick={openLightbox} />

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

        {/* Featured Video Section - Premium Design */}
        <section style={{ background: 'var(--cream)', padding: 'var(--space-2xl) 5%' }}>
          <div style={{ maxWidth: '950px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
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
                Watch Now
              </div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', color: 'var(--dark-brown)', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                Experience The Boma Cafe
              </h2>
              <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>
                Watch the atmosphere, energy, and experience of The Boma Cafe
              </p>
            </div>
            <div style={{
              background: 'var(--white)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <video 
                controls
                preload="metadata"
                poster="/images/about.jpg"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              >
                <source src="/videos/gallery.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* Social Media Buttons - Premium */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: 'var(--space-xl)', flexWrap: 'wrap' }}>
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
                <i className="fab fa-instagram" style={{ fontSize: '1.1rem' }} />
                <span>Follow on Instagram</span>
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
                <i className="fab fa-tiktok" style={{ fontSize: '1.1rem' }} />
                <span>Follow on TikTok</span>
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
                <i className="fab fa-facebook-f" style={{ fontSize: '1.1rem' }} />
                <span>Like on Facebook</span>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
