'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import GalleryBoards from '@/components/gallery/GalleryBoards';
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
    setSettings(dataService.getSettings());
    setGallery(dataService.getGallery());
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
        {/* Hero */}
        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>Gallery</h1>
          <p className={styles.heroSubtitle}>
            Capturing moments of joy, delicious food, and unforgettable experiences
          </p>
        </section>

        {/* Top Gallery - Main Feature */}
        <section className={styles.topGallerySection}>
          <div className={styles.topGalleryContainer} onClick={() => openLightbox(topGalleryImages.map(i => i.url), topGalleryIndex)}>
            <div 
              className={styles.topGalleryImage}
              style={{ backgroundImage: `url(${topGalleryImages[topGalleryIndex].url})` }}
            />
            <div className={styles.topGalleryOverlay}>
              <span className={styles.topGalleryTitle}>Welcome to The Boma Cafe</span>
            </div>
            <button 
              className={styles.topGalleryNav} 
              onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(prev => prev > 0 ? prev - 1 : topGalleryImages.length - 1); }}
            >
              ‹
            </button>
            <button 
              className={`${styles.topGalleryNav} ${styles.topGalleryNext}`}
              onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(prev => (prev + 1) % topGalleryImages.length); }}
            >
              ›
            </button>
            <div className={styles.topGalleryDots}>
              {topGalleryImages.map((_, idx) => (
                <button
                  key={idx}
                  className={`${styles.topGalleryDot} ${idx === topGalleryIndex ? styles.activeDot : ''}`}
                  onClick={(e) => { e.stopPropagation(); setTopGalleryIndex(idx); }}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <nav className={styles.categoryNav}>
          <div className={styles.categoryButtons}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`${styles.categoryBtn} ${activeCategory === cat ? styles.active : ''}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* Gallery Grid */}
        <section className={styles.gallerySection}>
          <div className={styles.galleryGrid}>
            {filteredGallery.map((item: any, index: number) => (
              <div 
                key={item.id}
                className={`${styles.galleryItem} ${index === 0 ? styles.featured : ''} ${index === 1 ? styles.secondary : ''}`}
                onClick={() => item.type === 'image' && openLightbox(filteredGallery.filter((i: any) => i.type === 'image').map((i: any) => i.url), filteredGallery.filter((i: any) => i.type === 'image').findIndex((i: any) => i.id === item.id))}
              >
                {item.type === 'video' ? (
                  <div className={styles.videoPlaceholder}>
                    <span className={styles.playIcon}>▶</span>
                  </div>
                ) : (
                  <div 
                    className={styles.galleryImage}
                    style={{ backgroundImage: `url(${item.url})` }}
                  />
                )}
                <div className={styles.galleryOverlay}>
                  {item.title && <span className={styles.galleryTitle}>{item.title}</span>}
                </div>
              </div>
            ))}
          </div>

          {filteredGallery.length === 0 && (
            <div className={styles.emptyState}>
              No items in this category
            </div>
          )}
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

        {/* Gallery Boards Section */}
        <GalleryBoards onImageClick={openLightbox} />

        {/* Featured Video Section */}
        <section className={styles.videoSection}>
          <div className={styles.videoContainer}>
            <div className={styles.videoHeader}>
              <h2 className={styles.videoTitle}>Featured Video</h2>
              <p className={styles.videoDesc}>Watch the atmosphere, energy, and experience of The Boma Cafe.</p>
            </div>
            <div className={styles.videoWrapper}>
              <video 
                controls
                preload="metadata"
                poster="/images/about.jpg"
                className={styles.video}
              >
                <source src="/videos/gallery.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* Social Media Buttons */}
            <div className={styles.socialButtons}>
              <a 
                href="https://www.instagram.com/the_boma_cafe" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialBtn + ' ' + styles.instagram}
              >
                <i className="fab fa-instagram" />
                Follow on Instagram
              </a>
              <a 
                href="https://www.tiktok.com/@thebomacafe" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialBtn + ' ' + styles.tiktok}
              >
                <i className="fab fa-tiktok" />
                Follow on TikTok
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=61552775920918" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.socialBtn + ' ' + styles.facebook}
              >
                <i className="fab fa-facebook-f" />
                Like on Facebook
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}
