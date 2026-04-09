'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';
import styles from './Gallery.module.css';

export default function GalleryPage() {
  const [settings, setSettings] = useState<any>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(dataService.getSettings());
    setGallery(dataService.getGallery());
  }, []);

  const categories = ['All', 'Events', 'Food', 'Venue', 'People', 'Promotions'];
  const filteredGallery = activeCategory === 'All' 
    ? gallery 
    : gallery.filter((item: any) => item.category === activeCategory);

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
                onClick={() => item.type === 'image' && setLightboxImage(item.url)}
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
          <div className={styles.lightbox} onClick={() => setLightboxImage(null)}>
            <img 
              src={lightboxImage} 
              alt="Gallery" 
              className={styles.lightboxImage}
            />
            <button 
              className={styles.lightboxClose}
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
          </div>
        )}

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