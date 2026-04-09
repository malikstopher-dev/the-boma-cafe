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

        {/* Featured Video Section */}
        <section style={{ background: 'var(--cream)', padding: '4rem 5%' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--dark-brown)', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Featured Video</h2>
              <p style={{ color: 'var(--text-light)', fontSize: '1rem' }}>Watch the atmosphere, energy, and experience of The Boma Cafe.</p>
            </div>
            <div style={{ 
              background: 'var(--white)',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 16px 48px rgba(0,0,0,0.12)'
            }}>
              <video 
                controls
                preload="metadata"
                poster="/images/about.jpg"
                className="w-full block rounded-lg"
              >
                <source src="/videos/gallery.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* Social Media Buttons */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '1rem', 
              marginTop: '2rem',
              flexWrap: 'wrap'
            }}>
              <a 
                href="https://www.instagram.com/the_boma_cafe" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  color: '#fff',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(225, 48, 108, 0.3)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(225, 48, 108, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(225, 48, 108, 0.3)';
                }}
              >
                <i className="fab fa-instagram" style={{ fontSize: '1.2rem' }} />
                Follow on Instagram
              </a>
              <a 
                href="https://www.tiktok.com/@thebomacafe" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  background: '#000',
                  color: '#fff',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
                }}
              >
                <i className="fab fa-tiktok" style={{ fontSize: '1.2rem' }} />
                Follow on TikTok
              </a>
              <a 
                href="https://www.facebook.com/profile.php?id=61552775920918" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem 2rem',
                  background: '#1877f2',
                  color: '#fff',
                  borderRadius: '50px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  boxShadow: '0 4px 15px rgba(24, 119, 242, 0.3)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(24, 119, 242, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(24, 119, 242, 0.3)';
                }}
              >
                <i className="fab fa-facebook-f" style={{ fontSize: '1.2rem' }} />
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