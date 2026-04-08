'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { dataService } from '@/lib/data';

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
      <main style={{ paddingTop: '80px' }}>
        {/* Hero */}
        <section style={{
          background: 'linear-gradient(135deg, var(--dark-brown) 0%, var(--dark-brown-light) 100%)',
          padding: '6rem 5%',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', color: 'var(--white)', marginBottom: '1rem' }}>Gallery</h1>
          <p style={{ color: 'var(--cream)', maxWidth: '600px', margin: '0 auto' }}>
            Capturing moments of joy, delicious food, and unforgettable experiences
          </p>
        </section>

        {/* Categories */}
        <section style={{ background: 'var(--cream)', padding: '2rem 5%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '25px',
                  border: 'none',
                  background: activeCategory === cat ? 'var(--primary)' : 'var(--white)',
                  color: activeCategory === cat ? 'var(--white)' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="section" style={{ background: 'var(--white)' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '1rem', 
              maxWidth: '1200px', 
              margin: '0 auto' 
            }}>
              {filteredGallery.map((item: any, index: number) => (
                <div 
                  key={item.id}
                  onClick={() => item.type === 'image' && setLightboxImage(item.url)}
                  style={{
                    gridColumn: index === 0 ? 'span 2' : index === 1 ? 'span 2' : 'span 1',
                    gridRow: index === 0 ? 'span 2' : index === 1 ? 'span 1' : 'span 1',
                    height: index === 0 ? '400px' : index === 1 ? '200px' : '200px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: item.type === 'image' ? 'pointer' : 'default',
                    position: 'relative',
                    background: item.type === 'video' ? 'var(--dark-brown)' : `url(${item.url}) center/cover`,
                    transition: 'transform 0.3s ease'
                  }}
                >
                  {item.type === 'video' && (
                    <div style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'var(--white)',
                      fontSize: '3rem'
                    }}>
                      ▶
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(26,15,10,0.7) 0%, transparent 50%)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '1rem'
                  }} className="gallery-overlay">
                    {item.title && <span style={{ color: 'var(--white)', fontWeight: 500 }}>{item.title}</span>}
                  </div>
                </div>
              ))}
            </div>

            {filteredGallery.length === 0 && (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-light)' }}>
                No items in this category
              </div>
            )}
          </div>
        </section>

        {/* Lightbox */}
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              cursor: 'pointer'
            }}
          >
            <img 
              src={lightboxImage} 
              alt="Gallery" 
              style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '8px' }}
            />
            <button 
              onClick={() => setLightboxImage(null)}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                background: 'var(--white)',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* CTA */}
        <section className="section" style={{ background: 'var(--dark-brown)', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2rem', color: 'var(--white)', marginBottom: '1rem' }}>Share Your Moments</h2>
            <p style={{ color: 'var(--cream)', marginBottom: '2rem' }}>Tag us on social media to be featured</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <a href="https://instagram.com" target="_blank" className="btn btn-ghost">Instagram</a>
              <a href="https://facebook.com" target="_blank" className="btn btn-ghost">Facebook</a>
            </div>
          </div>
        </section>
      </main>
      <Footer settings={settings} />
    </>
  );
}